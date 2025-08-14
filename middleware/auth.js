
const checkAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

const checkRole = (role) => {
  return (req, res, next) => {
    if (req.session.user.role !== role) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
};

module.exports = { checkAuth, checkRole };
