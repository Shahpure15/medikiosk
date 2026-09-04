const { query } = require('../db');
const { completeIntake } = require('./intakeService');

/**
 * Generate single-use Kiosk Verification Code (5-minute TTL)
 */
async function generateVerificationCode(hospitalId, kioskDeviceId = null) {
  let activeKioskId = kioskDeviceId;

  // If kioskDeviceId is not provided, look up the first active kiosk for this hospital
  if (!activeKioskId) {
    const kioskRes = await query(
      `SELECT id, location_label FROM kiosk_devices WHERE hospital_id = $1 AND is_active = true LIMIT 1`,
      [hospitalId]
    );
    if (kioskRes.rowCount > 0) {
      activeKioskId = kioskRes.rows[0].id;
    } else {
      // Create a default kiosk device for this hospital
      const newKioskRes = await query(
        `INSERT INTO kiosk_devices (hospital_id, location_label, is_active)
         VALUES ($1, 'Main OPD Reception Kiosk #1', true)
         RETURNING id, location_label`,
        [hospitalId]
      );
      activeKioskId = newKioskRes.rows[0].id;
    }
  }

  // Generate 4-character clean alphanumeric code (e.g. K-7842)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'K-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const res = await query(
    `INSERT INTO kiosk_verification_codes (kiosk_device_id, code, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [activeKioskId, code, expiresAt]
  );

  return {
    code: res.rows[0].code,
    expires_at: res.rows[0].expires_at,
    kiosk_device_id: activeKioskId
  };
}

/**
 * Patient Phone Scans Kiosk Code -> Flips is_kiosk_verified = true
 */
async function verifyKioskPresence(sessionId, code) {
  const cleanCode = code.trim().toUpperCase();

  const codeRes = await query(
    `SELECT * FROM kiosk_verification_codes 
     WHERE code = $1 AND used_at IS NULL AND expires_at > now()`,
    [cleanCode]
  );

  if (codeRes.rowCount === 0) {
    throw new Error('Invalid, expired, or already used kiosk verification code.');
  }

  const codeRecord = codeRes.rows[0];

  // Mark code as used
  await query(
    `UPDATE kiosk_verification_codes SET used_at = now(), session_id = $1 WHERE id = $2`,
    [sessionId, codeRecord.id]
  );

  // Flip session is_kiosk_verified to true
  const sessionRes = await query(
    `UPDATE patient_sessions SET is_kiosk_verified = true WHERE id = $1 RETURNING *`,
    [sessionId]
  );

  // If there is an active intake case for this session, complete queue check-in
  const caseRes = await query(
    `SELECT id FROM cases WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [sessionId]
  );

  let queueResult = null;
  if (caseRes.rowCount > 0) {
    queueResult = await completeIntake(caseRes.rows[0].id);
  }

  return {
    success: true,
    is_kiosk_verified: true,
    message: 'Kiosk presence verified successfully! You have entered the OPD queue.',
    queue_result: queueResult
  };
}

module.exports = {
  generateVerificationCode,
  verifyKioskPresence
};
