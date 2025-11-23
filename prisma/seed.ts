import { PrismaClient, ClassDay, NotificationType, AssessmentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Developer
  const developer = await prisma.user.upsert({
    where: { email: 'info@mmsurdu.pk' },
    update: {},
    create: {
      name: 'System Developer',
      email: 'info@mmsurdu.pk',
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

  // Create a single teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'john.teacher@school.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'john.teacher@school.com',
      password: bcrypt.hashSync('teacher123', 10),
      role: 'TEACHER',
      adminId: admin.id,
      mobile: '+1234567890',
      dateOfBirth: new Date('1985-03-15'),
      address: '123 Teacher Street, Education City',
      qualification: 'Master of Science in Mathematics',
      payRate: 50.0,
      payType: 'MONTHLY',
      payCurrency: 'USD',
    },
  });

  console.log('✅ Teacher created:', teacher.email);

  // Create two parents
  const parent1 = await prisma.user.upsert({
    where: { email: 'mike.parent@email.com' },
    update: {},
    create: {
      name: 'Mike Wilson',
      email: 'mike.parent@email.com',
      password: bcrypt.hashSync('parent123', 10),
      role: 'PARENT',
      adminId: admin.id,
      mobile: '+1234567892',
      address: '789 Family Lane, Parent City',
      profession: 'Software Engineer',
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
      mobile: '+1234567893',
      address: '321 Guardian Street, Family Town',
      profession: 'Marketing Manager',
    },
  });

  console.log('✅ Parents created:', parent1.email, parent2.email);

  // Create two students
  const student1 = await prisma.user.upsert({
    where: { email: 'emma.student@school.com' },
    update: {},
    create: {
      name: 'Emma Wilson',
      email: 'emma.student@school.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
      mobile: '+1234567894',
      dateOfBirth: new Date('2008-05-10'),
      address: '789 Family Lane, Parent City',
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
      mobile: '+1234567895',
      dateOfBirth: new Date('2009-02-18'),
      address: '321 Guardian Street, Family Town',
    },
  });

  console.log('✅ Students created:', student1.email, student2.email);

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

  console.log('✅ Courses created:', mathCourse.name, scienceCourse.name);

  // Parent-Student relationships (each student has a parent)
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

  // Teacher-Student assignments
  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher.id, studentId: student1.id } },
    update: {},
    create: {
      teacherId: teacher.id,
      studentId: student1.id,
    },
  });

  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher.id, studentId: student2.id } },
    update: {},
    create: {
      teacherId: teacher.id,
      studentId: student2.id,
    },
  });

  console.log('✅ Teacher-Student assignments created');

  // Student-Course assignments
  const studentCourses = [
    { studentId: student1.id, courseId: mathCourse.id },
    { studentId: student1.id, courseId: scienceCourse.id },
    { studentId: student2.id, courseId: mathCourse.id },
    { studentId: student2.id, courseId: scienceCourse.id },
  ];

  for (const sc of studentCourses) {
    await prisma.studentCourse.upsert({
      where: { studentId_courseId: { studentId: sc.studentId, courseId: sc.courseId } },
      update: {},
      create: sc,
    });
  }

  console.log('✅ Student-Course assignments created');

  // Detailed class assignments (schedule + fees)
  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student1.id, courseId: mathCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student1.id,
      courseId: mathCourse.id,
      teacherId: teacher.id,
      startTime: '09:00',
      duration: 60,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY, ClassDay.FRIDAY],
      timezone: 'UTC',
      monthlyFee: 150.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student1.id, courseId: scienceCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student1.id,
      courseId: scienceCourse.id,
      teacherId: teacher.id,
      startTime: '11:00',
      duration: 60,
      classDays: [ClassDay.TUESDAY, ClassDay.THURSDAY],
      timezone: 'UTC',
      monthlyFee: 140.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student2.id, courseId: mathCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student2.id,
      courseId: mathCourse.id,
      teacherId: teacher.id,
      startTime: '14:00',
      duration: 60,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY],
      timezone: 'UTC',
      monthlyFee: 150.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student2.id, courseId: scienceCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student2.id,
      courseId: scienceCourse.id,
      teacherId: teacher.id,
      startTime: '15:30',
      duration: 60,
      classDays: [ClassDay.TUESDAY, ClassDay.FRIDAY],
      timezone: 'UTC',
      monthlyFee: 140.0,
      currency: 'USD',
    },
  });

  console.log('✅ Class assignments created');

  // Progress records
  const progressRecords = [
    {
      studentId: student1.id,
      courseId: mathCourse.id,
      teacherId: teacher.id,
      lesson: 'Algebra Fundamentals',
      homework: 'Complete exercises 1-10 on page 45',
      lessonProgress: 90,
      score: 95,
      remarks: 'Excellent work on algebra problems.',
      attendance: 'PRESENT' as const,
    },
    {
      studentId: student1.id,
      courseId: scienceCourse.id,
      teacherId: teacher.id,
      lesson: 'Physics - Motion and Forces',
      homework: 'Read chapter 3 and solve practice problems',
      lessonProgress: 80,
      score: 84,
      remarks: 'Needs more practice with calculations.',
      attendance: 'PRESENT' as const,
    },
    {
      studentId: student2.id,
      courseId: mathCourse.id,
      teacherId: teacher.id,
      lesson: 'Geometry - Triangles',
      homework: 'Draw and calculate areas of different triangles',
      lessonProgress: 82,
      score: 85,
      remarks: 'Improving steadily.',
      attendance: 'LATE' as const,
    },
    {
      studentId: student2.id,
      courseId: scienceCourse.id,
      teacherId: teacher.id,
      lesson: 'Chemistry - Elements and Compounds',
      homework: 'Memorize first 20 elements of the periodic table',
      lessonProgress: 75,
      score: 78,
      remarks: 'Review chemical symbols.',
      attendance: 'PRESENT' as const,
    },
  ];

  for (const progress of progressRecords) {
    await prisma.progress.create({
      data: progress,
    });
  }

  console.log('✅ Progress records created');

  // Exam/Test templates
  const examTemplates = [
    {
      title: 'Mathematics Midterm Exam',
      description: 'Covers algebra fundamentals and geometry basics',
      type: AssessmentType.EXAM,
      courseId: mathCourse.id,
      maxMarks: 100,
      scheduledDate: new Date('2024-09-20'),
      adminId: admin.id,
      createdById: admin.id,
    },
    {
      title: 'Science Weekly Test',
      description: 'Short assessment on motion and forces',
      type: AssessmentType.TEST,
      courseId: scienceCourse.id,
      maxMarks: 50,
      scheduledDate: new Date('2024-09-05'),
      adminId: admin.id,
      createdById: admin.id,
    },
  ];

  const createdTemplates = [];
  for (const template of examTemplates) {
    const created = await prisma.examTemplate.create({ data: template });
    createdTemplates.push(created);
  }

  console.log('✅ Exam/Test templates created');

  // Test records
  const testRecords = [
    {
      studentId: student1.id,
      courseId: mathCourse.id,
      teacherId: teacher.id,
      examTemplateId: createdTemplates[0]?.id,
      title: createdTemplates[0]?.title || 'Mathematics Midterm Exam',
      type: AssessmentType.EXAM,
      performedAt: new Date('2024-09-21'),
      maxMarks: 100,
      obtainedMarks: 92,
      percentage: 92,
      performanceNote: 'Excellent algebra skills and clear working.',
      remarks: 'Keep up the great work!',
    },
    {
      studentId: student1.id,
      courseId: scienceCourse.id,
      teacherId: teacher.id,
      examTemplateId: createdTemplates[1]?.id,
      title: createdTemplates[1]?.title || 'Science Weekly Test',
      type: AssessmentType.TEST,
      performedAt: new Date('2024-09-06'),
      maxMarks: 50,
      obtainedMarks: 40,
      percentage: 80,
      performanceNote: 'Good understanding of concepts; minor calculation errors.',
      remarks: 'Revise motion formulas for faster recall.',
    },
    {
      studentId: student2.id,
      courseId: mathCourse.id,
      teacherId: teacher.id,
      examTemplateId: createdTemplates[0]?.id,
      title: createdTemplates[0]?.title || 'Mathematics Midterm Exam',
      type: AssessmentType.EXAM,
      performedAt: new Date('2024-09-21'),
      maxMarks: 100,
      obtainedMarks: 78,
      percentage: 78,
      performanceNote: 'Understands geometry; needs practice in algebraic proofs.',
      remarks: 'Focus on practice worksheets for algebra.',
    },
  ];

  for (const test of testRecords) {
    await prisma.testRecord.create({
      data: test,
    });
  }

  console.log('✅ Test records created');

  // Fees for each student/course
  const fees = [
    {
      studentId: student1.id,
      courseId: mathCourse.id,
      title: 'Tuition Fee - Mathematics',
      description: 'Monthly tuition fee for mathematics course',
      amount: 150.0,
      currency: 'USD',
      dueDate: new Date('2024-09-15'),
      status: 'PENDING' as const,
      month: 9,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student1.id,
      courseId: scienceCourse.id,
      title: 'Tuition Fee - Science',
      description: 'Monthly tuition fee for science course',
      amount: 140.0,
      currency: 'USD',
      dueDate: new Date('2024-09-15'),
      status: 'PAID' as const,
      paidDate: new Date('2024-09-10'),
      paidById: parent1.id,
      paidAmount: 140.0,
      month: 9,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student2.id,
      courseId: mathCourse.id,
      title: 'Tuition Fee - Mathematics',
      description: 'Monthly tuition fee for mathematics course',
      amount: 150.0,
      currency: 'USD',
      dueDate: new Date('2024-09-15'),
      status: 'PROCESSING' as const,
      paidDate: new Date('2024-09-12'),
      paidById: parent2.id,
      paidAmount: 150.0,
      month: 9,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student2.id,
      courseId: scienceCourse.id,
      title: 'Lab Fee - Science',
      description: 'Science laboratory equipment and materials fee',
      amount: 50.0,
      currency: 'USD',
      dueDate: new Date('2024-08-30'),
      status: 'OVERDUE' as const,
      month: 8,
      year: 2024,
      isRecurring: false,
    },
  ];

  for (const fee of fees) {
    await prisma.fee.create({
      data: fee,
    });
  }

  console.log('✅ Fees created');

  // Salary for the single teacher
  await prisma.salary.create({
    data: {
      teacherId: teacher.id,
      title: 'Monthly Salary - September 2024',
      description: 'Monthly salary for teaching mathematics and science',
      amount: 3000.0,
      currency: 'USD',
      dueDate: new Date('2024-09-30'),
      status: 'PENDING',
      month: 9,
      year: 2024,
      payType: 'MONTHLY',
      isRecurring: true,
    },
  });

  console.log('✅ Salary record created');

  // Admin subscription
  await prisma.subscription.create({
    data: {
      adminId: admin.id,
      plan: 'MONTHLY',
      amount: 29.99,
      currency: 'USD',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-09-01'),
      status: 'ACTIVE',
      paidAmount: 29.99,
      paidDate: new Date('2024-07-30'),
      paidById: admin.id,
    },
  });

  console.log('✅ Subscription created');

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.FEE_DUE,
        title: 'Fee Payment Due',
        message: 'Mathematics tuition fee is due on September 15, 2024',
        senderId: admin.id,
        receiverId: parent1.id,
      },
      {
        type: NotificationType.PROGRESS_UPDATE,
        title: 'Progress Update',
        message: 'Emma has completed her algebra fundamentals lesson with excellent performance',
        senderId: teacher.id,
        receiverId: parent1.id,
      },
      {
        type: NotificationType.SUBSCRIPTION_DUE,
        title: 'Subscription Renewal Due',
        message: 'Your monthly subscription will expire on October 1, 2024. Please renew to continue using the system.',
        senderId: developer.id,
        receiverId: admin.id,
      },
    ],
  });

  console.log('✅ Notifications created');

  // User settings
  const userSettingsData = [
    {
      userId: admin.id,
      enableNotifications: true,
      emailNotifications: true,
      parentRemarkNotifications: true,
      timezone: 'America/New_York',
      secretQuestion1: 'What is your favorite color?',
      secretAnswer1: 'Blue',
      secretQuestion2: 'What was your first pet\'s name?',
      secretAnswer2: 'Buddy',
    },
    {
      userId: parent1.id,
      enableNotifications: true,
      emailNotifications: true,
      parentRemarkNotifications: true,
      timezone: 'America/New_York',
    },
    {
      userId: teacher.id,
      enableNotifications: true,
      emailNotifications: false,
      parentRemarkNotifications: true,
      timezone: 'America/New_York',
    },
  ];

  for (const userSetting of userSettingsData) {
    await prisma.userSettings.create({
      data: userSetting,
    });
  }

  console.log('✅ User settings created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('Developer: info@mmsurdu.pk / developer123');
  console.log('Admin: admin@school.com / admin123');
  console.log('Teacher: john.teacher@school.com / teacher123');
  console.log('Parent 1: mike.parent@email.com / parent123');
  console.log('Parent 2: lisa.parent@email.com / parent123');
  console.log('Student 1: emma.student@school.com / student123');
  console.log('Student 2: alex.student@school.com / student123');
  }

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
