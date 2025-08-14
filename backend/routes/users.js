const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/roles');
const userController = require('../controllers/userController');

// Developer/Admin only
router.post('/', requireRole(['DEVELOPER', 'ADMIN']), userController.createUser);
router.get('/', requireRole(['DEVELOPER', 'ADMIN']), userController.listUsers);
router.get('/:id', requireRole(['DEVELOPER', 'ADMIN', 'TEACHER', 'PARENT', 'STUDENT']), userController.getUser);
router.put('/:id', requireRole(['DEVELOPER', 'ADMIN']), userController.updateUser);
router.delete('/:id', requireRole(['DEVELOPER', 'ADMIN']), userController.deleteUser);
router.get('/me', requireRole(['DEVELOPER', 'ADMIN', 'TEACHER', 'PARENT', 'STUDENT']), (req, res) => {
  res.json(req.session.user);
});

module.exports = router;
module.exports = router;
