const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/subjects', require('./subjects'));
router.use('/progress', require('./progress'));
router.use('/branding', require('./branding'));

module.exports = router;