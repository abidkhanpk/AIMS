
exports.getDashboard = (req, res) => {
  res.render('parent/dashboard', { user: req.session.user });
};
