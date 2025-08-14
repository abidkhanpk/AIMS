
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.getLogout);

// The dashboard route is protected by the isAuthenticated middleware
router.get('/dashboard', isAuthenticated, authController.getDashboard);

module.exports = router;
