const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Fetch academy branding for session
  let branding = null;
  if (user.academyId) {
    branding = await prisma.academy.findUnique({ where: { id: user.academyId } });
  }

  req.session.user = {
    id: user.id,
    role: user.role,
    academyId: user.academyId,
    name: user.name,
    email: user.email,
    branding: branding ? { title: branding.title, logoUrl: branding.logoUrl } : null
  };
  res.json({ message: 'Logged in', user: req.session.user });
}

function logout(req, res) {
  req.session.destroy();
  res.json({ message: 'Logged out' });
}

module.exports = { login, logout };
