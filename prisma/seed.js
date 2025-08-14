
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const saltRounds = 10;
    const password = await bcrypt.hash('password123', saltRounds);

    // Create Developer
    const developer = await prisma.user.create({
        data: {
            email: 'dev@lms.com',
            password,
            firstName: 'Super',
            lastName: 'Developer',
            role: 'DEVELOPER',
        },
    });

    // Create Academy and Admin
    const academy = await prisma.academy.create({
        data: {
            name: 'Global Tech Academy',
            appTitle: 'GTA LMS',
            admin: {
                create: {
                    email: 'admin@gta.com',
                    password,
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                }
            }
        },
        include: { admin: true }
    });

    const admin = academy.admin;

    // Create Teacher
    const teacher = await prisma.user.create({
        data: {
            email: 'teacher@gta.com',
            password,
            firstName: 'Teacher',
            lastName: 'User',
            role: 'TEACHER',
            academyId: academy.id,
            creatorId: admin.id,
        },
    });

    // Create Student
    const student = await prisma.user.create({
        data: {
            email: 'student@gta.com',
            password,
            firstName: 'Student',
            lastName: 'User',
            role: 'STUDENT',
            academyId: academy.id,
            creatorId: admin.id,
        },
    });

    // Create Parent
    const parent = await prisma.user.create({
        data: {
            email: 'parent@gta.com',
            password,
            firstName: 'Parent',
            lastName: 'User',
            role: 'PARENT',
            academyId: academy.id,
            creatorId: admin.id,
        },
    });

    // Create Subject
    const subject = await prisma.subject.create({
        data: {
            name: 'Introduction to Programming',
            description: 'Learn the fundamentals of programming.',
        },
    });

    // Assign student to teacher
    await prisma.user.update({
        where: { id: teacher.id },
        data: {
            studentsAsTeacher: { connect: { id: student.id } }
        }
    });

    // Assign parent to student
    await prisma.user.update({
        where: { id: parent.id },
        data: {
            childrenAsParent: { connect: { id: student.id } }
        }
    });

    // Enroll student in subject
    await prisma.user.update({
        where: { id: student.id },
        data: {
            subjects: { connect: { id: subject.id } }
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
