const express = require('express');
const router = express.Router();
const teacherController = require('../../controllers/teacher/teacherController');
const { hasRole } = require('../../middleware/authMiddleware');

// All routes in this file are protected and only accessible by Teachers
router.use(hasRole(['TEACHER']));

router.get('/students', teacherController.listAssignedStudents);
router.get('/students/:studentId/subjects/:subjectId/progress', teacherController.showStudentProgress);
router.post('/students/:studentId/subjects/:subjectId/progress', teacherController.addOrUpdateProgress);

module.exports = router;