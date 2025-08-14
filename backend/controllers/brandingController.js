const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setBranding(req, res) {
  const { appTitle, appLogoUrl } = req.body;
  const adminId = req.session.user.id;
  if (req.session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admin can set branding' });
  }
  const admin = await prisma.user.update({
    where: { id: adminId },
    data: { appTitle, appLogoUrl }
  });
  res.json({ appTitle: admin.appTitle, appLogoUrl: admin.appLogoUrl });
}

async function getBranding(req, res) {
  let adminId = req.session.user.role === 'ADMIN'
    ? req.session.user.id
    : req.session.user.adminId;
  if (!adminId) return res.status(404).json({ error: 'No admin found for branding' });
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  res.json({ appTitle: admin.appTitle, appLogoUrl: admin.appLogoUrl });
}

module.exports = { setBranding, getBranding };
