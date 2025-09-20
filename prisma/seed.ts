import { PrismaClient, ClassDay, NotificationType } from '@prisma/client';
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
      mobile: '+1234567890',
      dateOfBirth: new Date('1985-03-15'),
      address: '123 Teacher Street, Education City',
      qualification: 'Master of Science in Mathematics',
      payRate: 50.0,
      payType: 'MONTHLY',
      payCurrency: 'USD',
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
      mobile: '+1234567891',
      dateOfBirth: new Date('1988-07-22'),
      address: '456 Science Avenue, Knowledge Town',
      qualification: 'Master of Science in Physics',
      payRate: 55.0,
      payType: 'MONTHLY',
      payCurrency: 'USD',
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

  const student3 = await prisma.user.upsert({
    where: { email: 'sophia.student@school.com' },
    update: {},
    create: {
      name: 'Sophia Davis',
      email: 'sophia.student@school.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
      mobile: '+1234567896',
      dateOfBirth: new Date('2008-11-25'),
      address: '654 Student Boulevard, Learning District',
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

  // Create Assignment records (new model in schema)
  await prisma.assignment.create({
    data: {
      studentId: student1.id,
      courseId: mathCourse.id,
      teacherId: teacher1.id,
      startTime: '09:00',
      duration: 60,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY, ClassDay.FRIDAY],
      timezone: 'UTC',
      monthlyFee: 150.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.create({
    data: {
      studentId: student1.id,
      courseId: scienceCourse.id,
      teacherId: teacher2.id,
      startTime: '10:30',
      duration: 60,
      classDays: [ClassDay.TUESDAY, ClassDay.THURSDAY],
      timezone: 'UTC',
      monthlyFee: 140.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.create({
    data: {
      studentId: student2.id,
      courseId: mathCourse.id,
      teacherId: teacher1.id,
      startTime: '11:00',
      duration: 60,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY, ClassDay.FRIDAY],
      timezone: 'UTC',
      monthlyFee: 150.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.create({
    data: {
      studentId: student2.id,
      courseId: englishCourse.id,
      teacherId: teacher2.id,
      startTime: '14:00',
      duration: 60,
      classDays: [ClassDay.TUESDAY, ClassDay.THURSDAY],
      timezone: 'UTC',
      monthlyFee: 130.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.create({
    data: {
      studentId: student3.id,
      courseId: scienceCourse.id,
      teacherId: teacher2.id,
      startTime: '15:30',
      duration: 60,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY],
      timezone: 'UTC',
      monthlyFee: 140.0,
      currency: 'USD',
    },
  });

  await prisma.assignment.create({
    data: {
      studentId: student3.id,
      courseId: englishCourse.id,
      teacherId: teacher2.id,
      startTime: '16:30',
      duration: 60,
      classDays: [ClassDay.TUESDAY, ClassDay.FRIDAY],
      timezone: 'UTC',
      monthlyFee: 130.0,
      currency: 'USD',
    },
  });

  console.log('✅ Assignment records created');

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
      courseId: mathCourse.id,
      title: 'Tuition Fee - Mathematics',
      description: 'Monthly tuition fee for mathematics course',
      amount: 150.00,
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
      amount: 140.00,
      currency: 'USD',
      dueDate: new Date('2024-09-15'),
      status: 'PAID' as const,
      paidDate: new Date('2024-09-10'),
      paidById: parent1.id,
      paidAmount: 140.00,
      month: 9,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student2.id,
      courseId: mathCourse.id,
      title: 'Tuition Fee - Mathematics',
      description: 'Monthly tuition fee for mathematics course',
      amount: 150.00,
      currency: 'USD',
      dueDate: new Date('2024-09-15'),
      status: 'PENDING' as const,
      month: 9,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student2.id,
      courseId: englishCourse.id,
      title: 'Tuition Fee - English',
      description: 'Monthly tuition fee for English literature course',
      amount: 130.00,
      currency: 'USD',
      dueDate: new Date('2024-09-15'),
      status: 'PROCESSING' as const,
      paidDate: new Date('2024-09-12'),
      paidById: parent2.id,
      paidAmount: 130.00,
      month: 9,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student3.id,
      courseId: scienceCourse.id,
      title: 'Lab Fee - Science',
      description: 'Science laboratory equipment and materials fee',
      amount: 50.00,
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

  console.log('✅ Sample fees created');

  // Create sample salaries for teachers
  const salaries = [
    {
      teacherId: teacher1.id,
      title: 'Monthly Salary - September 2024',
      description: 'Monthly salary for teaching mathematics',
      amount: 3000.00,
      currency: 'USD',
      dueDate: new Date('2024-09-30'),
      status: 'PENDING' as const,
      month: 9,
      year: 2024,
      payType: 'MONTHLY' as const,
      isRecurring: true,
    },
    {
      teacherId: teacher2.id,
      title: 'Monthly Salary - September 2024',
      description: 'Monthly salary for teaching science and English',
      amount: 3200.00,
      currency: 'USD',
      dueDate: new Date('2024-09-30'),
      status: 'PAID' as const,
      paidDate: new Date('2024-09-28'),
      paidById: admin.id,
      paidAmount: 3200.00,
      month: 9,
      year: 2024,
      payType: 'MONTHLY' as const,
      isRecurring: true,
    },
  ];

  for (const salary of salaries) {
    await prisma.salary.create({
      data: salary,
    });
  }

  console.log('✅ Sample salaries created');

  // Create sample subscription for admin
  const subscription = await prisma.subscription.create({
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

  console.log('✅ Sample subscription created');

  // Create sample notifications
  await prisma.notification.create({
    data: {
      type: NotificationType.FEE_DUE,
      title: 'Fee Payment Due',
      message: 'Mathematics tuition fee is due on September 15, 2024',
      senderId: admin.id,
      receiverId: parent1.id,
    },
  });

  await prisma.notification.create({
    data: {
      type: NotificationType.PROGRESS_UPDATE,
      title: 'Progress Update',
      message: 'Emma has completed her algebra fundamentals lesson with excellent performance',
      senderId: teacher1.id,
      receiverId: parent1.id,
    },
  });

  await prisma.notification.create({
    data: {
      type: NotificationType.SALARY_PAID,
      title: 'Salary Payment Processed',
      message: 'Your September 2024 salary has been processed and paid',
      senderId: admin.id,
      receiverId: teacher2.id,
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      type: NotificationType.SUBSCRIPTION_DUE,
      title: 'Subscription Renewal Due',
      message: 'Your monthly subscription will expire on October 1, 2024. Please renew to continue using the system.',
      senderId: developer.id,
      receiverId: admin.id,
    },
  });

  console.log('✅ Sample notifications created');

  // Create user settings for some users
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
      userId: teacher1.id,
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

  console.log('✅ Sample user settings created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('Developer: info@mmsurdu.pk / developer123');
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