
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = user;
    switch (user.role) {
      case 'ADMIN':
        res.redirect('/admin/dashboard');
        break;
      case 'TEACHER':
        res.redirect('/teacher/dashboard');
        break;
      case 'STUDENT':
        res.redirect('/student/dashboard');
        break;
      case 'PARENT':
        res.redirect('/parent/dashboard');
        break;
      default:
        res.redirect('/');
    }
  } else {
    res.render('login', { error: 'Invalid email or password' });
  }
};

exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
