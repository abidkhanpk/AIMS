const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  // Create Academy
  const academy = await prisma.academy.create({
    data: {
      title: 'Sample Academy',
      logoUrl: '/assets/logo.png',
    },
  });

  // Developer
  const devPassword = await bcrypt.hash('devpass', 10);
  const developer = await prisma.user.create({
    data: {
      email: 'dev@lms.com',
      password: devPassword,
      name: 'Developer',
      role: 'DEVELOPER',
    },
  });

  // Admin
  const adminPassword = await bcrypt.hash('adminpass', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@lms.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
      academyId: academy.id,
    },
  });

  // Teacher
  const teacherPassword = await bcrypt.hash('teacherpass', 10);
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@lms.com',
      password: teacherPassword,
      name: 'Teacher',
      role: 'TEACHER',
      academyId: academy.id,
    },
  });

  // Parent
  const parentPassword = await bcrypt.hash('parentpass', 10);
  const parent = await prisma.user.create({
    data: {
      email: 'parent@lms.com',
      password: parentPassword,
      name: 'Parent',
      role: 'PARENT',
      academyId: academy.id,
    },
  });

  // Student
  const studentPassword = await bcrypt.hash('studentpass', 10);
  const student = await prisma.user.create({
    data: {
      email: 'student@lms.com',
      password: studentPassword,
      name: 'Student',
      role: 'STUDENT',
      academyId: academy.id,
      teachers: { connect: [{ id: teacher.id }] },
      parents: { connect: [{ id: parent.id }] },
    },
  });

  // Subject
  const subject = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      academyId: academy.id,
      teacherId: teacher.id,
      students: { connect: [{ id: student.id }] },
    },
  });

  // Progress
  await prisma.progress.create({
    data: {
      studentId: student.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      text: 'Good progress',
      percentage: 80,
    },
  });

  console.log('Seed completed. Sample users:');
  console.log('Developer: dev@lms.com / devpass');
  console.log('Admin: admin@lms.com / adminpass');
  console.log('Teacher: teacher@lms.com / teacherpass');
  console.log('Parent: parent@lms.com / parentpass');
  console.log('Student: student@lms.com / studentpass');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
