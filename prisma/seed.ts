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

  // Create sample progress records with correct field names and enum values
  const progressRecords = [
    {
      studentId: student1.id,
      courseId: mathCourse.id,
      teacherId: teacher1.id,
      lesson: 'Algebra Fundamentals',
      homework: 'Complete exercises 1-10 on page 45',
      lessonProgress: 92.5,
      score: 95.0,
      remarks: 'Excellent work on algebra problems. Shows strong understanding of concepts.',
      attendance: 'PRESENT' as const,
    },
    {
      studentId: student1.id,
      courseId: scienceCourse.id,
      teacherId: teacher2.id,
      lesson: 'Physics - Motion and Forces',
      homework: 'Read chapter 3 and solve practice problems',
      lessonProgress: 78.0,
      score: 82.0,
      remarks: 'Good progress in physics. Needs more practice with problem-solving.',
      attendance: 'PRESENT' as const,
    },
    {
      studentId: student2.id,
      courseId: mathCourse.id,
      teacherId: teacher1.id,
      lesson: 'Geometry - Triangles',
      homework: 'Draw and calculate areas of different triangles',
      lessonProgress: 85.0,
      score: 88.0,
      remarks: 'Improving steadily. Keep up the good work with geometry.',
      attendance: 'LATE' as const,
    },
    {
      studentId: student2.id,
      courseId: englishCourse.id,
      teacherId: teacher2.id,
      lesson: 'Creative Writing - Essay Structure',
      homework: 'Write a 500-word essay on your favorite book',
      lessonProgress: 94.0,
      score: 96.0,
      remarks: 'Outstanding essay writing skills. Creative and well-structured work.',
      attendance: 'PRESENT' as const,
    },
    {
      studentId: student3.id,
      courseId: scienceCourse.id,
      teacherId: teacher2.id,
      lesson: 'Biology - Cell Structure',
      homework: 'Study cell diagrams and prepare for quiz',
      lessonProgress: 88.5,
      score: 90.0,
      remarks: 'Shows great interest in biology. Participates actively in class.',
      attendance: 'PRESENT' as const,
    },
  ];

  for (const progress of progressRecords) {
    await prisma.progress.create({
      data: progress,
    });
  }

  console.log('✅ Sample progress records created');

  // Create sample fees
  const fees = [
    {
      studentId: student1.id,
      title: 'Tuition Fee - Semester 1',
      description: 'Tuition fee for the first semester',
      amount: 1500.00,
      dueDate: new Date('2024-09-15'),
      status: 'PENDING' as const,
    },
    {
      studentId: student1.id,
      title: 'Library Fee',
      description: 'Annual library access fee',
      amount: 50.00,
      dueDate: new Date('2024-08-30'),
      status: 'PAID' as const,
      paidDate: new Date('2024-08-25'),
      paidById: parent1.id,
    },
    {
      studentId: student2.id,
      title: 'Tuition Fee - Semester 1',
      description: 'Tuition fee for the first semester',
      amount: 1500.00,
      dueDate: new Date('2024-09-15'),
      status: 'PENDING' as const,
    },
    {
      studentId: student3.id,
      title: 'Lab Fee',
      description: 'Science laboratory equipment fee',
      amount: 100.00,
      dueDate: new Date('2024-09-01'),
      status: 'OVERDUE' as const,
    },
  ];

  for (const fee of fees) {
    await prisma.fee.create({
      data: fee,
    });
  }

  console.log('✅ Sample fees created');

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