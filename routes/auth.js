
const express = require('express');
const router = express.Router();

module.exports = (prisma) => {
  const authController = require('../controllers/authController')(prisma);

  router.get('/login', authController.getLogin);
  router.post('/login', authController.postLogin);
  router.post('/logout', authController.postLogout);

  return router;
};
