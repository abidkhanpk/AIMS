const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/student/studentController');
const { hasRole } = require('../../middleware/authMiddleware');

router.use(hasRole(['STUDENT']));

router.get('/progress', studentController.viewMyProgress);

module.exports = router;