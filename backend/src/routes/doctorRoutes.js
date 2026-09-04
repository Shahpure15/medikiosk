const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateStaff } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All doctor routes require staff authentication
router.use(authenticateStaff);

// Realtime Queue View (requires read on 'cases')
router.get('/queue', requirePermission('cases', 'read'), doctorController.getQueue);

// Queue Progression Actions (requires update on 'cases')
router.post('/queue/:tokenId/call', requirePermission('cases', 'update'), doctorController.callPatient);
router.post('/queue/:tokenId/start-consult', requirePermission('cases', 'update'), doctorController.startConsult);
router.post('/queue/:tokenId/no-show', requirePermission('cases', 'update'), doctorController.markNoShow);

// Case Consult Card (transcript, documents, OCR)
router.get('/cases/:caseId/consult-card', requirePermission('cases', 'read'), doctorController.getCaseConsultDetail);

// Typo-tolerant Medicine Search
router.get('/medicines/search', requirePermission('cases', 'read'), doctorController.searchMedicines);

// Issue Prescription & Complete Consult
router.post('/prescriptions', requirePermission('cases', 'update'), doctorController.issuePrescription);

module.exports = router;
