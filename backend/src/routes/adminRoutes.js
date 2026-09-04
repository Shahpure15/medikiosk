const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateStaff, authenticateSuperAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All admin routes require staff authentication
router.use(authenticateStaff);

// Hospital Settings & Presence Configuration
router.get('/hospital-settings', requirePermission('staff', 'read'), adminController.getHospitalSettings);
router.put('/hospital-settings', requirePermission('staff', 'update'), adminController.updateHospitalSettings);

// Departments Management
router.get('/departments', requirePermission('staff', 'read'), adminController.getDepartments);
router.post('/departments', requirePermission('staff', 'create'), adminController.createDepartment);

// Staff Management
router.get('/staff', requirePermission('staff', 'read'), adminController.getStaff);
router.post('/staff', requirePermission('staff', 'create'), adminController.createStaff);

// Roles & Permissions Matrix
router.get('/roles', requirePermission('roles', 'read'), adminController.getRoles);
router.get('/permissions-matrix', requirePermission('roles', 'read'), adminController.getPermissionsMatrix);

// Daily Doctor Room Assignments
router.get('/room-assignments', requirePermission('staff', 'read'), adminController.getRoomAssignments);
router.post('/room-assignments', requirePermission('staff', 'update'), adminController.setRoomAssignment);

// Registration Requests Approval
router.get('/registration-requests', requirePermission('staff', 'read'), adminController.getRegistrationRequests);
router.post('/registration-requests/:id/action', requirePermission('staff', 'approve'), adminController.handleRegistrationRequest);

// Super Admin Platform Routes
router.get('/superadmin/hospitals', authenticateSuperAdmin, requirePermission('hospitals', 'read'), adminController.getHospitals);
router.post('/superadmin/hospitals', authenticateSuperAdmin, requirePermission('hospitals', 'create'), adminController.createHospital);

module.exports = router;
