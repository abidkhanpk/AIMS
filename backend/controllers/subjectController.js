const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSubject(req, res) {
  const { name, academyId, teacherId, studentIds } = req.body;
  if (!name || !academyId || !teacherId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const subject = await prisma.subject.create({
    data: {
      name,
      academyId,
      teacherId,
      students: { connect: studentIds.map(id => ({ id })) },
    },
  });
  res.json(subject);
}

async function listSubjects(req, res) {
  const subjects = await prisma.subject.findMany({ include: { students: true, teacher: true } });
  res.json(subjects);
}

async function getSubject(req, res) {
  const subject = await prisma.subject.findUnique({
    where: { id: Number(req.params.id) },
    include: { students: true, teacher: true },
  });
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
}

async function updateSubject(req, res) {
  const { name, teacherId, studentIds } = req.body;
  const subject = await prisma.subject.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      teacherId,
      students: { set: studentIds.map(id => ({ id })) },
    },
  });
  res.json(subject);
}

async function deleteSubject(req, res) {
  await prisma.subject.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Subject deleted' });
}

module.exports = { createSubject, listSubjects, getSubject, updateSubject, deleteSubject };
