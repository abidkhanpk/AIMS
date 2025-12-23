import { PrismaClient, ClassDay, NotificationType, AssessmentType, SubscriptionStatus } from '@prisma/client';
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
      appTitle: 'Eilm-e-Quran Academy',
      headerImg: 'https://via.placeholder.com/200x60/28a745/ffffff?text=Greenwood+Academy',
    },
  });

  console.log('✅ Admin settings created');

  // Create a single teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher1@school.com' },
    update: {},
    create: {
      name: 'Qari Abdul Majeed Sb',
      email: 'teacher1@school.com',
      password: bcrypt.hashSync('teacher123', 10),
      role: 'TEACHER',
      adminId: admin.id,
      mobile: '+1234567890',
      dateOfBirth: new Date('1985-03-15'),
      address: 'House 123, Jami Street, Hall Road, Lahore',
      qualification: 'Hafiz, M.A. Arabic',
      payRate: 10000.0,
      payType: 'MONTHLY',
      payCurrency: 'PKR',
    },
  });

  console.log('✅ Teacher created:', teacher.email);

  // Create two parents
  const parent1 = await prisma.user.upsert({
    where: { email: 'parent1@email.com' },
    update: {},
    create: {
      name: 'Muhammad Nauman',
      email: 'parent1@email.com',
      password: bcrypt.hashSync('parent123', 10),
      role: 'PARENT',
      adminId: admin.id,
      mobile: '+1234567892',
      address: 'House 353, Qurtaba Street, Faisalabad',
      profession: 'Software Engineer',
    },
  });

  const parent2 = await prisma.user.upsert({
    where: { email: 'parent2@email.com' },
    update: {},
    create: {
      name: 'Abdur Rehman',
      email: 'parent2@email.com',
      password: bcrypt.hashSync('parent123', 10),
      role: 'PARENT',
      adminId: admin.id,
      mobile: '+1234567893',
      address: '353, Kings Valley, Red Castle, UK',
      profession: 'Doctor',
    },
  });

  console.log('✅ Parents created:', parent1.email, parent2.email);

  // Create two students
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@email.com' },
    update: {},
    create: {
      name: 'Zafar Nauman',
      email: 'student1@email.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
      mobile: '+1234567894',
      dateOfBirth: new Date('2008-05-10'),
      address: 'House 353, Qurtaba Street, Faisalabad',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@email.com' },
    update: {},
    create: {
      name: 'Wajeeha Nauman',
      email: 'student2@email.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
      mobile: '+1234567895',
      dateOfBirth: new Date('2009-02-18'),
      address: 'House 353, Qurtaba Street, Faisalabad',
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'student3@email.com' },
    update: {},
    create: {
      name: 'Junaid Ali',
      email: 'student3@email.com',
      password: bcrypt.hashSync('student123', 10),
      role: 'STUDENT',
      adminId: admin.id,
      mobile: '+1234567895',
      dateOfBirth: new Date('2009-02-18'),
      address: '353, Kings Valley, Red Castle, UK',
    },
  });

  console.log('✅ Students created:', student1.email, student2.email, student3.email);

  // Create Courses
  const tajweedCourse = await prisma.course.upsert({
    where: { id: 'tajweed-course-id' },
    update: {},
    create: {
      id: 'tajweed-course-id',
      name: 'Tajweed ul Quran',
      description: 'Reading Quran al Kareem with Tajweed rules.',
      adminId: admin.id,
    },
  });

  const basicIslamicEduCourse = await prisma.course.upsert({
    where: { id: 'basicIslamicEdu-course-id' },
    update: {},
    create: {
      id: 'basicIslamicEdu-course-id',
      name: 'Basic Islamic Education',
      description: 'Basic Islamic education including namaz, basic duas, and Islamic manners.',
      adminId: admin.id,
    },
  });

  console.log('✅ Courses created:', tajweedCourse.name, basicIslamicEduCourse.name);

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
    where: { parentId_studentId: { parentId: parent1.id, studentId: student2.id } },
    update: {},
    create: {
      parentId: parent1.id,
      studentId: student2.id,
    },
  });

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent2.id, studentId: student3.id } },
    update: {},
    create: {
      parentId: parent2.id,
      studentId: student3.id,
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

  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: teacher.id, studentId: student3.id } },
    update: {},
    create: {
      teacherId: teacher.id,
      studentId: student3.id,
    },
  });

  console.log('✅ Teacher-Student assignments created');

  // Student-Course assignments
  const studentCourses = [
    { studentId: student1.id, courseId: tajweedCourse.id },
    { studentId: student1.id, courseId: basicIslamicEduCourse.id },
    { studentId: student2.id, courseId: tajweedCourse.id },
    { studentId: student2.id, courseId: basicIslamicEduCourse.id },
    { studentId: student3.id, courseId: tajweedCourse.id },
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
    where: { studentId_courseId_teacherId: { studentId: student1.id, courseId: tajweedCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student1.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      startTime: '06:30',
      duration: 45,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY, ClassDay.FRIDAY],
      timezone: 'Asia/Karachi',
      monthlyFee: 7500.0,
      currency: 'PKR',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student1.id, courseId: basicIslamicEduCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student1.id,
      courseId: basicIslamicEduCourse.id,
      teacherId: teacher.id,
      startTime: '07:30',
      duration: 45,
      classDays: [ClassDay.TUESDAY, ClassDay.THURSDAY],
      timezone: 'Asia/Karachi',
      monthlyFee: 7000.0,
      currency: 'PKR',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student2.id, courseId: tajweedCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student2.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      startTime: '16:00',
      duration: 45,
      classDays: [ClassDay.MONDAY, ClassDay.WEDNESDAY],
      timezone: 'Europe/London',
      monthlyFee: 8000.0,
      currency: 'PKR',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student2.id, courseId: basicIslamicEduCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student2.id,
      courseId: basicIslamicEduCourse.id,
      teacherId: teacher.id,
      startTime: '17:00',
      duration: 45,
      classDays: [ClassDay.TUESDAY, ClassDay.FRIDAY],
      timezone: 'Europe/London',
      monthlyFee: 7200.0,
      currency: 'PKR',
    },
  });

  await prisma.assignment.upsert({
    where: { studentId_courseId_teacherId: { studentId: student3.id, courseId: tajweedCourse.id, teacherId: teacher.id } },
    update: {},
    create: {
      studentId: student3.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      startTime: '18:30',
      duration: 45,
      classDays: [ClassDay.TUESDAY, ClassDay.THURSDAY],
      timezone: 'Europe/London',
      monthlyFee: 60.0,
      currency: 'USD',
    },
  });

  console.log('✅ Class assignments created');

  // Progress records
  // Progress records with explicit dates (spread across days)
  const progressRecords = [
    {
      studentId: student1.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      lesson: 'Surah Al-Fatihah with Makharij',
      homework: 'Practice ayat 1-7 slowly with mirror for tongue placement',
      lessonProgress: 88,
      remarks: 'Beautiful pronunciation; small pauses needed after ayah 3.',
      attendance: 'PRESENT' as const,
      date: new Date('2024-09-01'),
    },
    {
      studentId: student1.id,
      courseId: basicIslamicEduCourse.id,
      teacherId: teacher.id,
      lesson: 'Morning & Evening Duas',
      homework: 'Memorize dua for waking up and sleeping',
      lessonProgress: 78,
      remarks: 'Understands meanings; needs fluency without looking.',
      attendance: 'PRESENT' as const,
      date: new Date('2024-09-02'),
    },
    {
      studentId: student1.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      lesson: 'Practice Surah An-Naas',
      homework: 'Recite Surah An-Naas thrice daily',
      lessonProgress: 90,
      remarks: 'Good pace; minor tajweed slips on qaf.',
      attendance: 'PRESENT' as const,
      date: new Date('2024-09-03'),
    },
    {
      studentId: student2.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      lesson: 'Noon Saakin & Tanween (Idghaam)',
      homework: 'Record 5 ayat applying idghaam with ghunnah',
      lessonProgress: 82,
      remarks: 'Good ghunnah length; watch qalqalah after idghaam.',
      attendance: 'LATE' as const,
      date: new Date('2024-09-01'),
    },
    {
      studentId: student2.id,
      courseId: basicIslamicEduCourse.id,
      teacherId: teacher.id,
      lesson: 'Seerah: Early Life of Rasulullah ﷺ',
      homework: 'Read the story of the cave Hira and summarize in 5 lines',
      lessonProgress: 74,
      remarks: 'Interested and asks good questions; needs concise summaries.',
      attendance: 'PRESENT' as const,
      date: new Date('2024-09-02'),
    },
    {
      studentId: student3.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      lesson: 'Qaidah review: Heavy vs Light letters',
      homework: 'Practice letters ص ض ط ظ and record audio',
      lessonProgress: 70,
      remarks: 'Tongue placement improving; continue slow-paced drills.',
      attendance: 'PRESENT' as const,
      date: new Date('2024-09-01'),
    },
    {
      studentId: student3.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      lesson: 'Surah Al-Ikhlas memorization',
      homework: 'Memorize and recite thrice daily',
      lessonProgress: 76,
      remarks: 'Pronunciation improving; keep steady pace.',
      attendance: 'PRESENT' as const,
      date: new Date('2024-09-04'),
    },
  ];

  const createdProgress: Array<{ id: string; studentId: string; courseId: string }> = [];
  for (const progress of progressRecords) {
    const created = await prisma.progress.create({
      data: progress,
    });
    createdProgress.push(created);
  }

  console.log('✅ Progress records created');

  // Parent remarks + replies (threads)
  const remarkTargets = {
    student1Tajweed: createdProgress.find(
      (p) => p.studentId === student1.id && p.courseId === tajweedCourse.id
    ),
    student2Islamic: createdProgress.find(
      (p) => p.studentId === student2.id && p.courseId === basicIslamicEduCourse.id
    ),
    student3Tajweed: createdProgress.find(
      (p) => p.studentId === student3.id && p.courseId === tajweedCourse.id
    ),
  };

  if (!remarkTargets.student1Tajweed || !remarkTargets.student2Islamic || !remarkTargets.student3Tajweed) {
    throw new Error('Missing progress records for remark seeding');
  }

  const parentRemarks = [
    {
      progressId: remarkTargets.student1Tajweed.id,
      parentId: parent1.id,
      remark: 'Zafar has been practicing Surah Al-Fatihah daily. Please suggest any specific ayat that need extra focus.',
    },
    {
      progressId: remarkTargets.student2Islamic.id,
      parentId: parent1.id,
      remark: 'Wajeeha enjoyed today’s Seerah story. Can we get a short reading list for her age?',
    },
    {
      progressId: remarkTargets.student3Tajweed.id,
      parentId: parent2.id,
      remark: 'Junaid is shy during recitation. Any tips to build his confidence before class?',
    },
  ];

  const createdRemarks: Array<{ id: string }> = [];
  for (const remark of parentRemarks) {
    const created = await prisma.parentRemark.create({ data: remark });
    createdRemarks.push(created);
  }

  const remarkReplies = [
    {
      remarkId: createdRemarks[0].id,
      authorId: teacher.id,
      content: 'Great to hear! Focus on ayat 4-5 for smoother transitions. I will review with him tomorrow.',
    },
    {
      remarkId: createdRemarks[0].id,
      authorId: admin.id,
      content: 'We will also share a short checklist for home practice tonight.',
    },
    {
      remarkId: createdRemarks[1].id,
      authorId: teacher.id,
      content: 'Sharing 3 short Seerah stories in Google Drive shortly. She can narrate one in the next class.',
    },
    {
      remarkId: createdRemarks[2].id,
      authorId: teacher.id,
      content: 'I will start the next class with a quick warm-up recitation. Encourage him to record a 1-minute clip at home.',
    },
    {
      remarkId: createdRemarks[2].id,
      authorId: parent2.id,
      content: 'Noted, we will practice a short recording this evening. Thank you!',
    },
  ];

  for (const reply of remarkReplies) {
    await prisma.parentRemarkReply.create({ data: reply });
  }

  console.log('✅ Parent remarks and replies created');

  // Test records
  const testRecords = [
    {
      studentId: student1.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      title: 'Tajweed Assessment - Makharij & Ghunnah',
      type: AssessmentType.EXAM,
      performedAt: new Date('2024-09-21'),
      maxMarks: 50,
      obtainedMarks: 45,
      percentage: 90,
      performanceNote: 'Makharij solid; ghunnah duration on point.',
      remarks: 'Maintain consistency when reading faster.',
    },
    {
      studentId: student1.id,
      courseId: basicIslamicEduCourse.id,
      teacherId: teacher.id,
      title: 'Duas & Adab Quiz',
      type: AssessmentType.QUIZ,
      performedAt: new Date('2024-09-06'),
      maxMarks: 30,
      obtainedMarks: 24,
      percentage: 80,
      performanceNote: 'Knows meanings; stumbled on sequence of duas.',
      remarks: 'Revise Arabic wording daily after Fajr.',
    },
    {
      studentId: student2.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      title: 'Noon Saakin & Tanween Oral Test',
      type: AssessmentType.EXAM,
      performedAt: new Date('2024-09-21'),
      maxMarks: 50,
      obtainedMarks: 39,
      percentage: 78,
      performanceNote: 'Understands rules; minor slips on idghaam without ghunnah.',
      remarks: 'Listen to recorded examples and mimic pace.',
    },
    {
      studentId: student3.id,
      courseId: tajweedCourse.id,
      teacherId: teacher.id,
      title: 'Qaidah Progress Check',
      type: AssessmentType.QUIZ,
      performedAt: new Date('2024-09-10'),
      maxMarks: 20,
      obtainedMarks: 15,
      percentage: 75,
      performanceNote: 'Heavy letters improving; needs louder projection.',
      remarks: 'Practice daily with metronome for pacing.',
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
      courseId: tajweedCourse.id,
      title: 'Tuition Fee - Tajweed',
      description: 'Monthly tuition fee for Tajweed ul Quran',
      amount: 7500.0,
      currency: 'PKR',
      dueDate: new Date('2024-10-05'),
      status: 'PENDING' as const,
      month: 10,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student1.id,
      courseId: basicIslamicEduCourse.id,
      title: 'Tuition Fee - Basic Islamic Education',
      description: 'Monthly tuition fee for Islamic basics and duas',
      amount: 7000.0,
      currency: 'PKR',
      dueDate: new Date('2024-10-05'),
      status: 'PAID' as const,
      paidDate: new Date('2024-09-28'),
      paidById: parent1.id,
      paidAmount: 7000.0,
      month: 10,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student2.id,
      courseId: tajweedCourse.id,
      title: 'Tuition Fee - Tajweed',
      description: 'Monthly tuition fee for Tajweed ul Quran',
      amount: 8000.0,
      currency: 'PKR',
      dueDate: new Date('2024-10-05'),
      status: 'PROCESSING' as const,
      paidDate: new Date('2024-10-02'),
      paidById: parent2.id,
      paidAmount: 8000.0,
      month: 10,
      year: 2024,
      isRecurring: true,
    },
    {
      studentId: student2.id,
      courseId: basicIslamicEduCourse.id,
      title: 'Resource Fee - Seerah & Duas',
      description: 'Books and worksheets for Seerah & Duas',
      amount: 2500.0,
      currency: 'PKR',
      dueDate: new Date('2024-09-25'),
      status: 'OVERDUE' as const,
      month: 9,
      year: 2024,
      isRecurring: false,
    },
    {
      studentId: student3.id,
      courseId: tajweedCourse.id,
      title: 'Tuition Fee - Qaidah/Tajweed',
      description: 'Monthly tuition fee for Qaidah/Tajweed',
      amount: 60.0,
      currency: 'USD',
      dueDate: new Date('2024-10-05'),
      status: 'PENDING' as const,
      month: 10,
      year: 2024,
      isRecurring: true,
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
      title: 'Monthly Salary - October 2024',
      description: 'Monthly salary for Tajweed and Basic Islamic Education classes',
      amount: 42000.0,
      currency: 'PKR',
      dueDate: new Date('2024-10-30'),
      status: 'PENDING',
      month: 10,
      year: 2024,
      payType: 'MONTHLY',
      isRecurring: true,
    },
  });

  console.log('✅ Salary record created');

  // Admin subscription history (3-4 months, monthly)
  // Seed monthly subscriptions: two months of history + current month active
  const now = new Date();
  const baseStart = new Date(now.getFullYear(), now.getMonth() - 2, 15); // two months back on the 15th
  const subsToCreate = [];
  for (let i = 0; i < 3; i++) {
    const start = new Date(baseStart);
    start.setMonth(start.getMonth() + i);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    subsToCreate.push({
      adminId: admin.id,
      plan: 'MONTHLY' as const,
      amount: 29.99,
      currency: 'USD',
      startDate: start,
      endDate: end,
      status: SubscriptionStatus.ACTIVE,
      paidAmount: 29.99,
      paidDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() - 2),
      paidById: admin.id,
      paymentDetails: 'Seeded payment',
      processedDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1),
    });
  }
  for (const sub of subsToCreate) {
    await prisma.subscription.create({ data: sub });
  }

  // Subscription payments history corresponding to the paid subscriptions
  for (let i = 0; i < 3; i++) {
    const start = new Date(baseStart);
    start.setMonth(start.getMonth() + i);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    await prisma.subscriptionPayment.create({
      data: {
        adminId: admin.id,
        amount: 29.99,
        currency: 'USD',
        plan: 'MONTHLY',
        paymentDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() - 2),
        expiryExtended: end,
        paymentDetails: 'Seeded payment',
        processedById: developer.id,
      },
    });
  }

  console.log('✅ Subscriptions and payments seeded');

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.FEE_DUE,
        title: 'Fee Payment Due',
        message: 'Tajweed tuition fee is due on October 5, 2024',
        senderId: admin.id,
        receiverId: parent1.id,
      },
      {
        type: NotificationType.PROGRESS_UPDATE,
        title: 'Progress Update',
        message: 'Zafar has completed Surah Al-Fatihah with excellent pronunciation',
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
    await prisma.userSettings.upsert({
      where: { userId: userSetting.userId },
      update: userSetting,
      create: userSetting,
    });
  }

  console.log('✅ User settings created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('Developer: info@mmsurdu.pk / developer123');
  console.log('Admin: admin@school.com / admin123');
  console.log('Teacher: teacher1@school.com / teacher123');
  console.log('Parent 1: parent1@email.com / parent123');
  console.log('Parent 2: parent2@email.com / parent123');
  console.log('Student 1: student1@email.com / student123');
  console.log('Student 2: student2@email.com / student123');
  console.log('Student 3: student3@email.com / student123');
  }

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
