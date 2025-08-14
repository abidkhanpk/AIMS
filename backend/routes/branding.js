const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/roles');
const brandingController = require('../controllers/brandingController');

// Admin sets branding
router.post('/', requireRole(['ADMIN']), brandingController.setBranding);
// All users get branding
router.get('/', brandingController.getBranding);

module.exports = router;
