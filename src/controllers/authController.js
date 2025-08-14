
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

exports.getLogin = (req, res) => {
    res.render('login', { title: 'Login', error: null });
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.userRole = user.role;
            // Redirect to the main dashboard route which will handle role-based redirection
            res.redirect('/dashboard');
        } else {
            res.render('login', { title: 'Login', error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.render('login', { title: 'Login', error: 'An error occurred.' });
    }
};

exports.getLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            // If error, still try to redirect to home
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};

// This function now acts as a router to the correct dashboard.
exports.getDashboard = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const userRole = req.session.userRole;
    switch (userRole) {
        case 'DEVELOPER':
            res.redirect('/developer/admins');
            break;
        case 'ADMIN':
            res.redirect('/admin/users');
            break;
        case 'TEACHER':
            res.redirect('/teacher/students');
            break;
        case 'PARENT':
            res.redirect('/parent/children');
            break;
        case 'STUDENT':
            res.redirect('/student/progress');
            break;
        default:
            res.redirect('/login');
    }
};
