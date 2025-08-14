const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createProgress(req, res) {
  const { studentId, subjectId, text, percentage } = req.body;
  if (!studentId || !subjectId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const teacherId = req.session.user.id;
  const progress = await prisma.progress.create({
    data: { studentId, subjectId, teacherId, text, percentage },
  });
  res.json(progress);
}

async function listProgress(req, res) {
  let filter = {};
  if (req.session.user.role === 'STUDENT') {
    filter.studentId = req.session.user.id;
  } else if (req.session.user.role === 'PARENT') {
    // Find all children of parent
    const children = await prisma.user.findMany({
      where: { parents: { some: { id: req.session.user.id } } },
    });
    filter.studentId = { in: children.map(c => c.id) };
  } else if (req.session.user.role === 'TEACHER') {
    filter.teacherId = req.session.user.id;
  }
  const progress = await prisma.progress.findMany({ where: filter });
  res.json(progress);
}

async function getProgress(req, res) {
  const progress = await prisma.progress.findUnique({ where: { id: Number(req.params.id) } });
  if (!progress) return res.status(404).json({ error: 'Progress not found' });
  res.json(progress);
}

async function updateProgress(req, res) {
  const { text, percentage } = req.body;
  const progress = await prisma.progress.update({
    where: { id: Number(req.params.id) },
    data: { text, percentage },
  });
  res.json(progress);
}

async function deleteProgress(req, res) {
  await prisma.progress.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Progress deleted' });
}

module.exports = { createProgress, listProgress, getProgress, updateProgress, deleteProgress };
