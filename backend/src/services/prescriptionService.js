const { query, getClient } = require('../db');

/**
 * Typo-tolerant Medicine Search via pg_trgm & ILIKE
 */
async function searchMedicines(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    const res = await query(`SELECT * FROM medicines ORDER BY name ASC LIMIT 20`);
    return res.rows;
  }

  const term = searchTerm.trim();

  // Try pg_trgm similarity search combined with prefix match
  try {
    const res = await query(
      `SELECT *, similarity(name, $1) AS sim 
       FROM medicines 
       WHERE name ILIKE $2 OR generic_name ILIKE $2 OR similarity(name, $1) > 0.15
       ORDER BY sim DESC, name ASC 
       LIMIT 20`,
      [term, `%${term}%`]
    );
    return res.rows;
  } catch (e) {
    // Fallback standard ILIKE if pg_trgm not enabled on DB instance
    const res = await query(
      `SELECT * FROM medicines 
       WHERE name ILIKE $1 OR generic_name ILIKE $1 
       ORDER BY name ASC 
       LIMIT 20`,
      [`%${term}%`]
    );
    return res.rows;
  }
}

/**
 * Issue Doctor Prescription & Mark Case + Token as 'completed'
 */
async function createPrescription(caseId, doctorId, remarks, nextCheckupDate, items = []) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Insert Prescription
    const rxRes = await client.query(
      `INSERT INTO prescriptions (case_id, doctor_id, remarks, next_checkup_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [caseId, doctorId, remarks, nextCheckupDate || null]
    );
    const prescription = rxRes.rows[0];

    // 2. Insert Prescription Items
    for (const item of items) {
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, dosage, frequency, timing, duration_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          prescription.id,
          item.medicine_id,
          item.dosage || '1 tablet',
          item.frequency || '1-0-1', // Indian shorthand
          item.timing || 'after_food',
          parseInt(item.duration_days || 5, 10),
          item.notes || null
        ]
      );
    }

    // 3. Mark Case as 'completed'
    await client.query(
      `UPDATE cases SET status = 'completed' WHERE id = $1`,
      [caseId]
    );

    // 4. Mark Token as 'completed'
    await client.query(
      `UPDATE tokens SET status = 'completed' WHERE case_id = $1`,
      [caseId]
    );

    await client.query('COMMIT');

    // Fetch full prescription with items
    const fullRx = await getPrescriptionById(prescription.id);
    return fullRx;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get Prescription details by ID
 */
async function getPrescriptionById(prescriptionId) {
  const rxRes = await query(
    `SELECT rx.*, 
            u.name as doctor_name, u.abha_id as doctor_abha_id,
            d.name as department_name,
            c.chief_complaint, c.created_at as case_date,
            p.name as patient_name, p.phone as patient_phone, p.age as patient_age, p.gender as patient_gender, p.abha_id as patient_abha_id,
            h.name as hospital_name, h.address as hospital_address
     FROM prescriptions rx
     JOIN users u ON rx.doctor_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id
     JOIN cases c ON rx.case_id = c.id
     JOIN patient_sessions s ON c.session_id = s.id
     JOIN patients p ON s.patient_id = p.id
     JOIN hospitals h ON c.hospital_id = h.id
     WHERE rx.id = $1`,
    [prescriptionId]
  );

  if (rxRes.rowCount === 0) return null;

  const rx = rxRes.rows[0];

  const itemsRes = await query(
    `SELECT pi.*, m.name as medicine_name, m.generic_name, m.form, m.strength
     FROM prescription_items pi
     JOIN medicines m ON pi.medicine_id = m.id
     WHERE pi.prescription_id = $1
     ORDER BY pi.id ASC`,
    [prescriptionId]
  );

  rx.items = itemsRes.rows;
  return rx;
}

/**
 * Get Patient Past History across all visits/sessions
 */
async function getPatientHistory(patientId, hospitalId) {
  const casesRes = await query(
    `SELECT c.*, 
            d.name as department_name,
            rx.id as prescription_id, rx.remarks, rx.next_checkup_date, rx.created_at as prescription_date,
            doc.name as doctor_name
     FROM cases c
     JOIN patient_sessions s ON c.session_id = s.id
     LEFT JOIN departments d ON c.department_id = d.id
     LEFT JOIN prescriptions rx ON c.id = rx.case_id
     LEFT JOIN users doc ON rx.doctor_id = doc.id
     WHERE s.patient_id = $1 AND c.hospital_id = $2
     ORDER BY c.created_at DESC`,
    [patientId, hospitalId]
  );

  return casesRes.rows;
}

module.exports = {
  searchMedicines,
  createPrescription,
  getPrescriptionById,
  getPatientHistory
};
