
exports.getDashboard = (req, res) => {
  res.render('student/dashboard', { user: req.session.user });
};
