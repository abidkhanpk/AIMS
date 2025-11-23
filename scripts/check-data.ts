import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });
  console.log('Users by role:', roles);

  const teacherStudents = await prisma.teacherStudent.findMany({
    select: { teacherId: true, studentId: true },
  });
  console.log('Teacher-Student links:', teacherStudents);

  const studentCourses = await prisma.studentCourse.findMany({
    select: { studentId: true, courseId: true },
  });
  console.log('Student-Course links:', studentCourses);

  const progress = await prisma.progress.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      courseId: true,
      lesson: true,
      attendance: true,
    },
  });
  console.log('Sample progress (latest 5):', progress);

  const tests = await prisma.testRecord.findMany({
    take: 5,
    orderBy: { performedAt: 'desc' },
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      courseId: true,
      title: true,
      type: true,
      obtainedMarks: true,
      maxMarks: true,
    },
  });
  console.log('Sample tests (latest 5):', tests);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
