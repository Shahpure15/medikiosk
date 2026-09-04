const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');
const { authenticatePatientSession } = require('../middleware/auth');

// List kiosks
router.get('/devices/:hospitalId', kioskController.listKiosks);

// Kiosk Screen: generate single-use verification QR code
router.post('/verification-code', kioskController.generateVerificationCode);

// Patient Phone: scan and verify kiosk presence
router.post('/verify-presence', authenticatePatientSession, kioskController.verifyPresence);

module.exports = router;
