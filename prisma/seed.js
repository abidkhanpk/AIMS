
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create Developer
  const developer = await prisma.user.create({
    data: {
      email: 'developer@lms.com',
      password: hashedPassword,
      role: 'DEVELOPER',
      firstName: 'Developer',
      lastName: 'User',
    },
  });

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@lms.com',
      password: hashedPassword,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  // Create Academy
  const academy = await prisma.academy.create({
    data: {
      name: 'My Academy',
      adminId: admin.id,
    },
  });

  // Update Admin with Academy ID
  await prisma.user.update({
    where: { id: admin.id },
    data: { academyId: academy.id },
  });

  // Create Teacher
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@lms.com',
      password: hashedPassword,
      role: 'TEACHER',
      firstName: 'Teacher',
      lastName: 'User',
      academyId: academy.id,
    },
  });

  // Create Student
  const student = await prisma.user.create({
    data: {
      email: 'student@lms.com',
      password: hashedPassword,
      role: 'STUDENT',
      firstName: 'Student',
      lastName: 'User',
      academyId: academy.id,
    },
  });

  // Create Parent
  const parent = await prisma.user.create({
    data: {
      email: 'parent@lms.com',
      password: hashedPassword,
      role: 'PARENT',
      firstName: 'Parent',
      lastName: 'User',
      academyId: academy.id,
    },
  });

  // Create Subject
  const subject = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      description: 'Learn about numbers and equations.',
    },
  });

  // Assign Student to Subject
  await prisma.studentSubject.create({
    data: {
      studentId: student.id,
      subjectId: subject.id,
    },
  });

  // Assign Teacher to Student
  await prisma.userRelation.create({
    data: {
      teacherId: teacher.id,
      studentId: student.id,
    },
  });

  // Assign Parent to Student
  await prisma.userRelation.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
      teacherId: teacher.id,
    },
  });

  console.log({ developer, admin, teacher, student, parent });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
