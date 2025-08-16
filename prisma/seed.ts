import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Developer
  const developer = await prisma.user.upsert({
    where: { email: 'developer@lms.com' },
    update: {},
    create: {
      name: 'System Developer',
      email: 'developer@lms.com',
      password: bcrypt.hashSync('developer123', 10),
      role: 'DEVELOPER',
    },
  });

  console.log('✅ Developer created:', developer.email);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      name: 'School Administrator',
      email: 'admin@school.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin created:', admin.email);

  // Create Admin Settings
  await prisma.settings.upsert({
    where: { adminId: admin.id },
    update: {},
    create: {
      adminId: admin.id,
      appTitle: 'Greenwood Academy',
      headerImg: 'https://via.placeholder.com/200x60/28a745/ffffff?text=Greenwood+Academy',
    },
  });

  console.log('✅ Admin settings created');

  // Create Teachers
  const teacher1 = await prisma.user.upsert({
    where: { email: 'john.teacher@school.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'john.teacher@school.com',
      password: bcrypt.hashSync('teacher123', 10),
      role: 'TEACHER',
      adminId: admin.id,
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'sarah.teacher@school.com' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'sarah.teacher@school.com',
      password: bcrypt.hashSync('teacher123', 10),
      role: 'TEACHER',
      adminId: admin.id,
    },
  });

  console.log('✅ Teachers created:', teacher1.email, teacher2.email);

  // Create Parents
  const parent1 = await prisma.user.upsert({
    where: { email: 'mike.parent@email.com' },
    update: {},
    create: {
      name: 'Mike Wilson',
      email: 'mike.parent@email.com',
      password: bcrypt.hashSync('parent123', 10),
      role: 'PARENT',
      adminId: admin.id,
    },
  });

  const parent2 = await prisma.user.upsert({
    where: { email: 'lisa.parent@email.com' },
    update: {},
    create: {
      name: 'Lisa Brown',
      email: 'lisa.parent@email.com',
      password: bcrypt.hashSync('parent123', 10),
      role: 'PARENT',
      adminId: admin.id,
    },
  });

  console.log('✅ Parents created:', parent1.email, parent2.email);

  // Create Students
  const student1 = await prisma.user.upsert({
    where: { email: 'emma.student@school.com' },
    update: {},
    create: {
      name: 'Emma Wilson',
      email: 'emma.student@school.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'alex.student@school.com' },
    update: {},
    create: {
      name: 'Alex Brown',
      email: 'alex.student@school.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'sophia.student@school.com' },
    update: {},
    create: {
      name: 'Sophia Davis',
      email: 'sophia.student@school.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
    },
  });

  console.log('✅ Students created:', student1.email, student2.email, student3.email);

  // Create Courses
  const mathCourse = await prisma.course.upsert({
    where: { id: 'math-course-id' },
    update: {},
    create: {
      id: 'math-course-id',
      name: 'Mathematics',
      description: 'Advanced mathematics including algebra, geometry, and calculus',
      adminId: admin.id,
    },
  });

  const scienceCourse = await prisma.course.upsert({
    where: { id: 'science-course-id' },
    update: {},
    create: {
      id: 'science-course-id',
      name: 'Science',
      description: 'General science covering physics, chemistry, and biology',
      adminId: admin.id,
    },
  });

  const englishCourse = await prisma.course.upsert({
    where: { id: 'english-course-id' },
    update: {},
    create: {
      id: 'english-course-id',
      name: 'English Literature',
      description: 'English language arts and literature studies',
      adminId: admin.id,
    },
  });

  console.log('✅ Courses created:', mathCourse.name, scienceCourse.name, englishCourse.name);

  // Create Parent-Student relationships
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent1.id, studentId: student1.id } },
    update: {},
    create: {
      parentId: parent1.id,
      studentId: student1.id,
    },
  });

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent2.id, studentId: student2.id } },
    update: {},
    create: {
      parentId: parent2.id,
      studentId: student2.id,
    },
  });

  console.log('✅ Parent-Student relationships created');

  // Create Teacher-Student assignments
  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher1.id, studentId: student1.id } },
    update: {},
    create: {
      teacherId: teacher1.id,
      studentId: student1.id,
    },
  });

  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher1.id, studentId: student2.id } },
    update: {},
    create: {
      teacherId: teacher1.id,
      studentId: student2.id,
    },
  });

  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher2.id, studentId: student2.id } },
    update: {},
    create: {
      teacherId: teacher2.id,
      studentId: student2.id,
    },
  });

  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher2.id, studentId: student3.id } },
    update: {},
    create: {
      teacherId: teacher2.id,
      studentId: student3.id,
    },
  });

  console.log('✅ Teacher-Student assignments created');

  // Create Student-Course assignments
  const studentCourses = [
    { studentId: student1.id, courseId: mathCourse.id },
    { studentId: student1.id, courseId: scienceCourse.id },
    { studentId: student2.id, courseId: mathCourse.id },
    { studentId: student2.id, courseId: englishCourse.id },
    { studentId: student3.id, courseId: scienceCourse.id },
    { studentId: student3.id, courseId: englishCourse.id },
  ];

  for (const sc of studentCourses) {
    await prisma.studentCourse.upsert({
      where: { studentId_courseId: { studentId: sc.studentId, courseId: sc.courseId } },
      update: {},
      create: sc,
    });
  }

  console.log('✅ Student-Course assignments created');

  // Create sample progress records
  const progressRecords = [
    {
      studentId: student1.id,
      courseId: mathCourse.id,
      teacherId: teacher1.id,
      text: 'Excellent work on algebra problems. Shows strong understanding of concepts.',
      percent: 92.5,
    },
    {
      studentId: student1.id,
      courseId: scienceCourse.id,
      teacherId: teacher2.id,
      text: 'Good progress in physics. Needs more practice with problem-solving.',
      percent: 78.0,
    },
    {
      studentId: student2.id,
      courseId: mathCourse.id,
      teacherId: teacher1.id,
      text: 'Improving steadily. Keep up the good work with geometry.',
      percent: 85.0,
    },
    {
      studentId: student2.id,
      courseId: englishCourse.id,
      teacherId: teacher2.id,
      text: 'Outstanding essay writing skills. Creative and well-structured work.',
      percent: 94.0,
    },
    {
      studentId: student3.id,
      courseId: scienceCourse.id,
      teacherId: teacher2.id,
      text: 'Shows great interest in biology. Participates actively in class.',
      percent: 88.5,
    },
  ];

  for (const progress of progressRecords) {
    await prisma.progress.create({
      data: progress,
    });
  }

  console.log('✅ Sample progress records created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('Developer: developer@lms.com / developer123');
  console.log('Admin: admin@school.com / admin123');
  console.log('Teacher 1: john.teacher@school.com / teacher123');
  console.log('Teacher 2: sarah.teacher@school.com / teacher123');
  console.log('Parent 1: mike.parent@email.com / parent123');
  console.log('Parent 2: lisa.parent@email.com / parent123');
  console.log('Student 1: emma.student@school.com / student123');
  console.log('Student 2: alex.student@school.com / student123');
  console.log('Student 3: sophia.student@school.com / student123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });