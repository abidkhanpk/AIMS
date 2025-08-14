
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
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};

exports.getDashboard = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
        res.render('dashboard', { title: 'Dashboard', user });
    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};
