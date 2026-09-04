const { query } = require('../db');
const { emitToRoom } = require('./wsService');

/**
 * Issue new Queue Token
 */
async function issueToken(caseId, hospitalId, departmentId, isPriority = false, carriedFromTokenId = null) {
  const today = new Date().toISOString().split('T')[0];

  // 1. Calculate next sequential token number for this hospital, department, and date
  const numRes = await query(
    `SELECT COALESCE(MAX(token_number), 0) + 1 as next_number 
     FROM tokens 
     WHERE hospital_id = $1 AND department_id = $2 AND token_date = $3`,
    [hospitalId, departmentId, today]
  );
  const tokenNumber = parseInt(numRes.rows[0].next_number, 10);

  // 2. Fetch room assignment if department has an assigned doctor today
  const roomRes = await query(
    `SELECT dra.room_number, u.id as doctor_id
     FROM doctor_room_assignments dra
     JOIN users u ON dra.doctor_id = u.id
     WHERE u.hospital_id = $1 AND u.department_id = $2 AND dra.assignment_date = $3
     LIMIT 1`,
    [hospitalId, departmentId, today]
  );

  const roomNumber = roomRes.rows[0]?.room_number || null;
  const assignedDoctorId = roomRes.rows[0]?.doctor_id || null;

  // 3. Insert Token
  const tokenRes = await query(
    `INSERT INTO tokens (case_id, hospital_id, department_id, doctor_id, token_date, token_number, status, priority, room_number, carried_from_token_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7, $8, $9)
     RETURNING *`,
    [caseId, hospitalId, departmentId, assignedDoctorId, today, tokenNumber, isPriority, roomNumber, carriedFromTokenId]
  );
  const token = tokenRes.rows[0];

  // 4. Update Case status
  await query(
    `UPDATE cases SET status = 'ready_for_doctor', assigned_doctor_id = $1 WHERE id = $2`,
    [assignedDoctorId, caseId]
  );

  // 5. Fetch chief complaint & department name for lightweight WebSocket event payload
  const caseDetailRes = await query(
    `SELECT c.chief_complaint, c.created_at, d.name as department_name, p.name as patient_name
     FROM cases c
     LEFT JOIN departments d ON c.department_id = d.id
     LEFT JOIN patient_sessions s ON c.session_id = s.id
     LEFT JOIN patients p ON s.patient_id = p.id
     WHERE c.id = $1`,
    [caseId]
  );

  const cDetail = caseDetailRes.rows[0];

  // Emit single lightweight WS event to hospital room: case_ready
  emitToRoom(`hospital:${hospitalId}`, {
    event: 'case_ready',
    token_id: token.id,
    token_number: token.token_number,
    priority: token.priority,
    case_id: caseId,
    patient_name: cDetail?.patient_name || 'Patient',
    chief_complaint: cDetail?.chief_complaint || 'General Consultation',
    department: cDetail?.department_name || 'General OPD',
    created_at: cDetail?.created_at || new Date()
  });

  return token;
}

/**
 * Fetch Doctor Queue for today (ordered by priority DESC, token_number ASC)
 */
async function getDoctorQueue(hospitalId, departmentId = null) {
  const today = new Date().toISOString().split('T')[0];

  let sql = `
    SELECT t.*, 
           c.chief_complaint, c.status as case_status, c.created_at as case_created_at,
           p.id as patient_id, p.name as patient_name, p.phone as patient_phone, p.age as patient_age, p.gender as patient_gender, p.abha_id,
           d.name as department_name,
           u.name as doctor_name
    FROM tokens t
    JOIN cases c ON t.case_id = c.id
    JOIN patient_sessions s ON c.session_id = s.id
    JOIN patients p ON s.patient_id = p.id
    JOIN departments d ON t.department_id = d.id
    LEFT JOIN users u ON t.doctor_id = u.id
    WHERE t.hospital_id = $1 AND t.token_date = $2 AND t.status IN ('waiting', 'called', 'in_consult', 'no_show')
  `;
  const params = [hospitalId, today];

  if (departmentId) {
    sql += ` AND t.department_id = $3`;
    params.push(departmentId);
  }

  sql += ` ORDER BY t.priority DESC, t.token_number ASC`;

  const res = await query(sql, params);
  return res.rows;
}

/**
 * Doctor Action 1: Call Patient
 */
async function callPatient(tokenId, doctorId) {
  const today = new Date().toISOString().split('T')[0];

  // Get doctor's assigned room for today
  const roomRes = await query(
    `SELECT room_number FROM doctor_room_assignments WHERE doctor_id = $1 AND assignment_date = $2`,
    [doctorId, today]
  );
  const roomNumber = roomRes.rows[0]?.room_number || 'OPD Consultation Room';

  // Update token to 'called'
  const tokenRes = await query(
    `UPDATE tokens 
     SET status = 'called', called_at = now(), doctor_id = $1, room_number = $2 
     WHERE id = $3 
     RETURNING *`,
    [doctorId, roomNumber, tokenId]
  );

  if (tokenRes.rowCount === 0) {
    throw new Error('Token not found');
  }

  const token = tokenRes.rows[0];

  // Narrow WebSocket Notification directly to patient's waiting room
  emitToRoom(`case:${token.case_id}`, {
    event: 'your_turn',
    token_number: token.token_number,
    room_number: roomNumber,
    message: `It is your turn! Please proceed to ${roomNumber}.`,
    called_at: token.called_at
  });

  return token;
}

/**
 * Doctor Action 2: Start Consult (Distinct from Call)
 */
async function startConsult(tokenId) {
  const tokenRes = await query(
    `UPDATE tokens SET status = 'in_consult' WHERE id = $1 RETURNING *`,
    [tokenId]
  );

  if (tokenRes.rowCount === 0) {
    throw new Error('Token not found');
  }

  const token = tokenRes.rows[0];
  await query(`UPDATE cases SET status = 'in_consult' WHERE id = $1`, [token.case_id]);

  return token;
}

/**
 * Doctor Action 3: Mark No-Show (when advancing queue while token is still in 'called' state)
 */
async function markNoShow(tokenId) {
  const res = await query(
    `UPDATE tokens SET status = 'no_show' WHERE id = $1 RETURNING *`,
    [tokenId]
  );
  return res.rows[0];
}

/**
 * End-of-day Carry-Forward Simulation
 */
async function processCarryForward(hospitalId) {
  const today = new Date().toISOString().split('T')[0];

  // Tokens eligible for carry-forward
  const unserved = await query(
    `SELECT * FROM tokens 
     WHERE hospital_id = $1 AND token_date = $2 AND status IN ('waiting', 'called', 'no_show')`,
    [hospitalId, today]
  );

  const results = [];
  for (const t of unserved.rows) {
    await query(
      `UPDATE tokens SET status = 'carried_forward', rsvp_status = 'confirmed' WHERE id = $1`,
      [t.id]
    );

    // Create tomorrow's priority token
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const numRes = await query(
      `SELECT COALESCE(MAX(token_number), 0) + 1 as next_number FROM tokens WHERE hospital_id = $1 AND department_id = $2 AND token_date = $3`,
      [hospitalId, t.department_id, tomorrow]
    );

    const newTokenRes = await query(
      `INSERT INTO tokens (case_id, hospital_id, department_id, token_date, token_number, status, priority, carried_from_token_id, rsvp_status)
       VALUES ($1, $2, $3, $4, $5, 'waiting', true, $6, 'confirmed')
       RETURNING *`,
      [t.case_id, hospitalId, t.department_id, tomorrow, parseInt(numRes.rows[0].next_number, 10), t.id]
    );
    results.push(newTokenRes.rows[0]);
  }

  return { carried_count: results.length, carried_tokens: results };
}

module.exports = {
  issueToken,
  getDoctorQueue,
  callPatient,
  startConsult,
  markNoShow,
  processCarryForward
};
