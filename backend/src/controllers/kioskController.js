const { query } = require('../db');
const kioskService = require('../services/kioskService');

/**
 * GET /api/kiosk/devices/:hospitalId
 */
async function listKiosks(req, res) {
  try {
    const { hospitalId } = req.params;
    const result = await query(
      `SELECT id, location_label, is_active FROM kiosk_devices WHERE hospital_id = $1 AND is_active = true`,
      [hospitalId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/kiosk/verification-code
 */
async function generateVerificationCode(req, res) {
  try {
    const { hospital_id, kiosk_device_id } = req.body;
    if (!hospital_id) {
      return res.status(400).json({ error: 'hospital_id is required' });
    }
    const result = await kioskService.generateVerificationCode(hospital_id, kiosk_device_id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * POST /api/kiosk/verify-presence
 */
async function verifyPresence(req, res) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    const sessionId = req.patientSession.id;
    const result = await kioskService.verifyKioskPresence(sessionId, code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  listKiosks,
  generateVerificationCode,
  verifyPresence
};
