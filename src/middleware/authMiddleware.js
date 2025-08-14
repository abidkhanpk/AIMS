
exports.isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

exports.hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        const userRole = req.session.userRole;
        if (roles.includes(userRole)) {
            return next();
        }
        res.status(403).send('Forbidden');
    };
};
