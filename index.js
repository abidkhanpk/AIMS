
try {
  const express = require('express');
  const bodyParser = require('body-parser');
  const cookieParser = require('cookie-parser');
  const session = require('express-session');
  const csrf = require('csurf');
  const { PrismaClient } = require('@prisma/client');
  const { withAccelerate } = require('@prisma/extension-accelerate');

  console.log('Initializing Prisma...');
  const prisma = new PrismaClient().$extends(withAccelerate());
  console.log('Prisma initialized.');

  const app = express();
  const port = process.env.PORT || 3000;

  app.set('view engine', 'ejs');
  app.use(express.static('public'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  const csrfProtection = csrf({ cookie: true });
  app.use(csrfProtection);

  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });

  // Routes
  console.log('Loading routes...');
  const authRoutes = require('./routes/auth')(prisma);
  const adminRoutes = require('./routes/admin');
  const teacherRoutes = require('./routes/teacher');
  const studentRoutes = require('./routes/student');
  const parentRoutes = require('./routes/parent');
  const { checkAuth, checkRole } = require('./middleware/auth');
  console.log('Routes loaded.');

  app.use(authRoutes);
  app.use('/admin', checkAuth, checkRole('ADMIN'), adminRoutes);
  app.use('/teacher', checkAuth, checkRole('TEACHER'), teacherRoutes);
  app.use('/student', checkAuth, checkRole('STUDENT'), studentRoutes);
  app.use('/parent', checkAuth, checkRole('PARENT'), parentRoutes);

  app.get('/', (req, res) => {
    res.render('login', { error: null });
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
} catch (error) {
  console.error('Unhandled exception:', error);
  process.exit(1);
}
