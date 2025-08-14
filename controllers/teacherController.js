
exports.getDashboard = (req, res) => {
  res.render('teacher/dashboard', { user: req.session.user });
};
