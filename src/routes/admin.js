const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const { hasRole } = require('../../middleware/authMiddleware');

// All routes in this file are protected and only accessible by Admins
router.use(hasRole(['ADMIN']));

// User Management Routes
router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id/edit', adminController.showEditUser);
router.post('/users/:id/edit', adminController.updateUser);
router.post('/users/:id/delete', adminController.deleteUser);

// Subject Management Routes
router.get('/subjects', adminController.listSubjects);
router.post('/subjects', adminController.createSubject);
router.get('/subjects/:id/edit', adminController.showEditSubject);
router.post('/subjects/:id/edit', adminController.updateSubject);
router.post('/subjects/:id/delete', adminController.deleteSubject);

module.exports = router;