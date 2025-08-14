const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/roles');
const subjectController = require('../controllers/subjectController');

// Admin only
router.post('/', requireRole(['ADMIN']), subjectController.createSubject);
router.get('/', requireRole(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']), subjectController.listSubjects);
router.get('/:id', requireRole(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']), subjectController.getSubject);
router.put('/:id', requireRole(['ADMIN']), subjectController.updateSubject);
router.delete('/:id', requireRole(['ADMIN']), subjectController.deleteSubject);

module.exports = router;
