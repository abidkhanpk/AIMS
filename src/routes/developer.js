const express = require('express');
const router = express.Router();
const developerController = require('../../controllers/developer/developerController');
const { hasRole } = require('../../middleware/authMiddleware');

router.use(hasRole(['DEVELOPER']));

router.get('/admins', developerController.listAdmins);
router.post('/admins', developerController.createAdmin);

module.exports = router;