const bcrypt = require('bcryptjs');
const { query } = require('../db');

/**
 * GET /api/admin/hospital-settings
 */
async function getHospitalSettings(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const result = await query(`SELECT * FROM hospitals WHERE id = $1`, [hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Hospital not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/admin/hospital-settings
 */
async function updateHospitalSettings(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const { physical_presence_required, registration_mode, name, address, contact_phone } = req.body;

    const result = await query(
      `UPDATE hospitals 
       SET physical_presence_required = COALESCE($1, physical_presence_required),
           registration_mode = COALESCE($2, registration_mode),
           name = COALESCE($3, name),
           address = COALESCE($4, address),
           contact_phone = COALESCE($5, contact_phone)
       WHERE id = $6
       RETURNING *`,
      [physical_presence_required, registration_mode, name, address, contact_phone, hospitalId]
    );

    res.json({ message: 'Hospital settings updated successfully', hospital: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/departments
 */
async function getDepartments(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const result = await query(
      `SELECT * FROM departments WHERE hospital_id = $1 ORDER BY name ASC`,
      [hospitalId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/admin/departments
 */
async function createDepartment(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const { name, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });

    const result = await query(
      `INSERT INTO departments (hospital_id, name, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [hospitalId, name, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/staff
 */
async function getStaff(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.abha_id, u.created_at,
              r.id as role_id, r.name as role_name,
              d.id as department_id, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.hospital_id = $1
       ORDER BY u.created_at DESC`,
      [hospitalId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/admin/staff
 */
async function createStaff(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const { name, email, phone, role_id, department_id, password, abha_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (hospital_id, department_id, role_id, name, email, phone, password_hash, status, abha_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
       RETURNING id, name, email, phone, status, role_id, department_id, abha_id`,
      [hospitalId, department_id || null, role_id, name, email, phone, passwordHash, abha_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/roles
 */
async function getRoles(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const result = await query(
      `SELECT * FROM roles WHERE hospital_id = $1 OR hospital_id IS NULL ORDER BY name ASC`,
      [hospitalId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/permissions-matrix
 */
async function getPermissionsMatrix(req, res) {
  try {
    const hospitalId = req.user.hospital_id;

    const rolesRes = await query(
      `SELECT id, name FROM roles WHERE hospital_id = $1 OR hospital_id IS NULL ORDER BY name ASC`,
      [hospitalId]
    );
    const modulesRes = await query(`SELECT id, key FROM modules ORDER BY key ASC`);
    const permsRes = await query(
      `SELECT p.role_id, m.key as module_key, p.action 
       FROM permissions p
       JOIN modules m ON p.module_id = m.id`
    );

    res.json({
      roles: rolesRes.rows,
      modules: modulesRes.rows,
      permissions: permsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/room-assignments
 */
async function getRoomAssignments(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT dra.*, u.name as doctor_name, d.name as department_name
       FROM doctor_room_assignments dra
       JOIN users u ON dra.doctor_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.hospital_id = $1 AND dra.assignment_date = $2
       ORDER BY dra.room_number ASC`,
      [hospitalId, date]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/admin/room-assignments
 */
async function setRoomAssignment(req, res) {
  try {
    const { doctor_id, room_number, assignment_date } = req.body;
    const targetDate = assignment_date || new Date().toISOString().split('T')[0];

    if (!doctor_id || !room_number) {
      return res.status(400).json({ error: 'doctor_id and room_number are required' });
    }

    const result = await query(
      `INSERT INTO doctor_room_assignments (doctor_id, room_number, assignment_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (doctor_id, assignment_date) 
       DO UPDATE SET room_number = EXCLUDED.room_number
       RETURNING *`,
      [doctor_id, room_number, targetDate]
    );

    res.json({ message: 'Room assigned successfully', assignment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/registration-requests
 */
async function getRegistrationRequests(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const result = await query(
      `SELECT rr.*, r.name as requested_role_name
       FROM registration_requests rr
       LEFT JOIN roles r ON rr.requested_role_id = r.id
       WHERE rr.hospital_id = $1
       ORDER BY rr.created_at DESC`,
      [hospitalId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/admin/registration-requests/:id/action
 */
async function handleRegistrationRequest(req, res) {
  try {
    const { id } = req.params;
    const { action, default_password } = req.body;

    const reqRes = await query(`SELECT * FROM registration_requests WHERE id = $1`, [id]);
    if (reqRes.rowCount === 0) return res.status(404).json({ error: 'Request not found' });
    const regReq = reqRes.rows[0];

    if (action === 'approve') {
      const pass = default_password || 'Password@123';
      const hash = await bcrypt.hash(pass, 10);

      await query(
        `INSERT INTO users (hospital_id, role_id, name, email, phone, password_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [regReq.hospital_id, regReq.requested_role_id, regReq.name, regReq.email, regReq.phone, hash]
      );

      await query(`UPDATE registration_requests SET status = 'approved' WHERE id = $1`, [id]);
      res.json({ message: 'Request approved and staff account created' });
    } else {
      await query(`UPDATE registration_requests SET status = 'rejected' WHERE id = $1`, [id]);
      res.json({ message: 'Request rejected' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ============ SUPER ADMIN (Platform Multi-Tenant) ============

async function getHospitals(req, res) {
  try {
    const result = await query(`SELECT * FROM hospitals ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createHospital(req, res) {
  try {
    const { name, registration_mode, physical_presence_required, address, contact_phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Hospital name is required' });

    const result = await query(
      `INSERT INTO hospitals (name, registration_mode, physical_presence_required, address, contact_phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, registration_mode || 'admin_creates', physical_presence_required !== false, address, contact_phone]
    );

    res.status(201).json({ message: 'Hospital provisioned successfully', hospital: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getHospitalSettings,
  updateHospitalSettings,
  getDepartments,
  createDepartment,
  getStaff,
  createStaff,
  getRoles,
  getPermissionsMatrix,
  getRoomAssignments,
  setRoomAssignment,
  getRegistrationRequests,
  handleRegistrationRequest,
  getHospitals,
  createHospital
};
