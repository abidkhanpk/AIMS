const express = require('express');
const router = express.Router();
const parentController = require('../../controllers/parent/parentController');
const { hasRole } = require('../../middleware/authMiddleware');

router.use(hasRole(['PARENT']));

router.get('/children', parentController.listChildrenProgress);

module.exports = router;