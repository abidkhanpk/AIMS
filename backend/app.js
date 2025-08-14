require('dotenv').config();
const express = require('express');
const session = require('express-session');
const csrf = require('csurf');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));
app.use(csrf());

// CSRF token endpoint for AJAX forms
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Session user endpoint for frontend auth check
app.get('/session/user', (req, res) => {
  if (req.session.user) {
    // Always refresh session user from DB for latest branding/settings
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findUnique({ where: { id: req.session.user.id } })
      .then(user => {
        if (!user) return res.status(401).json({ error: 'Not authenticated' });
        // If not admin, get branding from their admin
        if (user.role !== 'ADMIN' && user.adminId) {
          prisma.user.findUnique({ where: { id: user.adminId } })
            .then(admin => {
              res.json({
                user: {
                  ...req.session.user,
                  appTitle: admin?.appTitle || 'LMS Academy',
                  appLogoUrl: admin?.appLogoUrl || '/assets/logo.png'
                }
              });
            });
        } else {
          res.json({
            user: {
              ...req.session.user,
              appTitle: user.appTitle || 'LMS Academy',
              appLogoUrl: user.appLogoUrl || '/assets/logo.png'
            }
          });
        }
      });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Middleware to expose session user to frontend templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use('/', routes);

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

module.exports = app;
