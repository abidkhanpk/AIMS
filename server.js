
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const csrf = require('csurf');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

// View engine setup
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// CSRF protection middleware
const csrfProtection = csrf();
app.use(csrfProtection);

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

const authRoutes = require('./src/routes/auth');

// Middleware to pass user to all views if logged in
app.use(async (req, res, next) => {
    if (req.session.userId) {
        res.locals.user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    }
    next();
});

// Routes
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.render('index', { title: 'LMS Home' });
});

app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/dashboard', (req, res) => res.redirect('/auth/dashboard'));


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;
