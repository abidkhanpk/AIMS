const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createUser(req, res) {
  const { email, password, name, role, academyId } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, name, role, academyId: academyId || null },
  });
  res.json(user);
}

async function listUsers(req, res) {
  const users = await prisma.user.findMany();
  res.json(users);
}

async function getUser(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid or missing user id' });
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

async function updateUser(req, res) {
  const { name, role, academyId } = req.body;
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { name, role, academyId: academyId || null },
  });
  res.json(user);
}

async function deleteUser(req, res) {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'User deleted' });
}

module.exports = { createUser, listUsers, getUser, updateUser, deleteUser };
