
const bcrypt = require('bcrypt');

module.exports = (prisma) => {
  const getLogin = (req, res) => {
    res.render('login', { error: null });
  };

  const postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = user;
        switch (user.role) {
          case 'ADMIN':
            return res.redirect('/admin/dashboard');
          case 'TEACHER':
            return res.redirect('/teacher/dashboard');
          case 'STUDENT':
            return res.redirect('/student/dashboard');
          case 'PARENT':
            return res.redirect('/parent/dashboard');
          default:
            return res.redirect('/');
        }
      } else {
        res.render('login', { error: 'Invalid email or password' });
      }
    } catch (error) {
      console.error(error);
      res.render('login', { error: 'An error occurred. Please try again.' });
    }
  };

  const postLogout = (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  };

  return {
    getLogin,
    postLogin,
    postLogout,
  };
};
