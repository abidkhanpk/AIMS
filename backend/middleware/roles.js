const roleHierarchy = {
  DEVELOPER: 4,
  ADMIN: 3,
  TEACHER: 2,
  PARENT: 1,
  STUDENT: 0
};

function requireRole(roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    // Allow higher roles to access lower role routes
    const userLevel = roleHierarchy[user.role];
    const requiredLevels = roles.map(r => roleHierarchy[r]);
    if (!requiredLevels.some(lvl => userLevel >= lvl)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireRole };
