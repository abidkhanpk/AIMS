const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/roles');
const progressController = require('../controllers/progressController');

// Teacher can create/update progress
router.post('/', requireRole(['TEACHER']), progressController.createProgress);
router.get('/', requireRole(['TEACHER', 'STUDENT', 'PARENT']), progressController.listProgress);
router.get('/:id', requireRole(['TEACHER', 'STUDENT', 'PARENT']), progressController.getProgress);
router.put('/:id', requireRole(['TEACHER']), progressController.updateProgress);
router.delete('/:id', requireRole(['TEACHER']), progressController.deleteProgress);

module.exports = router;
