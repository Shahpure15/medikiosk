const authService = require('../services/authService');
const { query } = require('../db');

/**
 * POST /api/auth/staff/login
 */
async function loginStaff(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.loginStaff(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

/**
 * POST /api/auth/staff/register-request
 */
async function registerStaffRequest(req, res) {
  try {
    const { hospital_id, name, phone, email, requested_role_id } = req.body;
    if (!hospital_id || !name || !email) {
      return res.status(400).json({ error: 'Hospital, name, and email are required' });
    }
    const result = await authService.submitRegistrationRequest(hospital_id, name, phone, email, requested_role_id);
    res.status(201).json({ message: 'Registration request submitted for admin approval', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/auth/patient/send-otp
 */
async function sendPatientOtp(req, res) {
  try {
    const { hospital_id, phone } = req.body;
    if (!hospital_id || !phone) {
      return res.status(400).json({ error: 'Hospital ID and phone number are required' });
    }
    const result = await authService.sendPatientOtp(hospital_id, phone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/auth/patient/verify-otp
 */
async function verifyPatientOtp(req, res) {
  try {
    const { hospital_id, phone, otp, is_kiosk, language_pref } = req.body;
    if (!hospital_id || !phone || !otp) {
      return res.status(400).json({ error: 'Hospital ID, phone, and OTP are required' });
    }
    const result = await authService.verifyPatientOtp(
      hospital_id,
      phone,
      otp,
      Boolean(is_kiosk),
      language_pref || 'en'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * PUT /api/auth/patient/profile
 */
async function updatePatientProfile(req, res) {
  try {
    const patientId = req.patient.id;
    const hospitalId = req.patient.hospital_id;
    const updated = await authService.updatePatientProfile(patientId, hospitalId, req.body);
    res.json({ message: 'Profile updated successfully', patient: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  if (req.user) {
    return res.json({ type: 'staff', user: req.user });
  }
  if (req.patient) {
    return res.json({ type: 'patient', patient: req.patient, session: req.patientSession });
  }
  res.status(401).json({ error: 'Not authenticated' });
}

module.exports = {
  loginStaff,
  registerStaffRequest,
  sendPatientOtp,
  verifyPatientOtp,
  updatePatientProfile,
  getMe
};
