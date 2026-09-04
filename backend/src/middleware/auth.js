const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_sih2026_medikiosk_ayush';

/**
 * Authenticate Staff / Admin JWT
 * Payload contains only user_id, hospital_id, role_id.
 * Permissions are never cached in token and are queried live by RBAC middleware.
 */
const authenticateStaff = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.user_id) {
      return res.status(401).json({ error: 'Invalid staff token payload' });
    }

    // Verify user is active in DB
    const userRes = await query(
      `SELECT u.id, u.hospital_id, u.department_id, u.role_id, u.name, u.email, u.status, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [decoded.user_id]
    );

    if (userRes.rowCount === 0 || userRes.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'User account inactive or not found' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid', details: err.message });
  }
};

/**
 * Super Admin Gate: route-gated, verifies user has no hospital_id (platform level)
 */
const authenticateSuperAdmin = async (req, res, next) => {
  await authenticateStaff(req, res, () => {
    if (req.user && req.user.hospital_id === null) {
      return next();
    }
    return res.status(403).json({ error: 'Super Admin platform access required' });
  });
};

/**
 * Authenticate Patient Session
 * Validates token against patient_sessions with expires_at check.
 */
const authenticatePatientSession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const sessionTokenHeader = req.headers['x-session-token'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : sessionTokenHeader;

  if (!token) {
    return res.status(401).json({ error: 'Patient session token required' });
  }

  try {
    let sessionTokenValue = token;
    // If it's a signed JWT, decode it to get the raw session token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.session_token) {
        sessionTokenValue = decoded.session_token;
      }
    } catch (e) {
      // If not a JWT, use token directly as the UUID/token string
    }

    // Fetch active session
    const sessionRes = await query(
      `SELECT s.*, p.phone, p.name, p.age, p.gender, p.abha_id, h.name as hospital_name
       FROM patient_sessions s
       JOIN patients p ON s.patient_id = p.id
       JOIN hospitals h ON s.hospital_id = h.id
       WHERE s.token = $1`,
      [sessionTokenValue]
    );

    if (sessionRes.rowCount === 0) {
      return res.status(401).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    // Check expiry
    const now = new Date();
    if (new Date(session.expires_at) < now || session.status === 'expired') {
      if (session.status !== 'expired') {
        await query(`UPDATE patient_sessions SET status = 'expired' WHERE id = $1`, [session.id]);
      }
      return res.status(401).json({ error: 'Session has expired. Please start a new visit.' });
    }

    req.patientSession = session;
    req.patient = {
      id: session.patient_id,
      phone: session.phone,
      name: session.name,
      age: session.age,
      gender: session.gender,
      abha_id: session.abha_id,
      hospital_id: session.hospital_id
    };

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to authenticate patient session', details: err.message });
  }
};

module.exports = {
  authenticateStaff,
  authenticateSuperAdmin,
  authenticatePatientSession,
  JWT_SECRET
};
