const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateStaff, authenticatePatientSession } = require('../middleware/auth');

// Staff Auth
router.post('/staff/login', authController.loginStaff);
router.post('/staff/register-request', authController.registerStaffRequest);

// Patient Auth (OTP only, no password per PRD Section 5)
router.post('/patient/send-otp', authController.sendPatientOtp);
router.post('/patient/verify-otp', authController.verifyPatientOtp);
router.put('/patient/profile', authenticatePatientSession, authController.updatePatientProfile);

// Me
router.get('/me', (req, res, next) => {
  // Try staff then patient
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticateStaff(req, res, () => authController.getMe(req, res));
  } else {
    authenticatePatientSession(req, res, () => authController.getMe(req, res));
  }
});

module.exports = router;
