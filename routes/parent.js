
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

router.get('/dashboard', parentController.getDashboard);

module.exports = router;
