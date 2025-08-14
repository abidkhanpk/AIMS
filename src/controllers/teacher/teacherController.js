const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listAssignedStudents = async (req, res) => {
    const teacher = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { 
            studentsAsTeacher: {
                include: { subjects: true }
            }
        }
    });
    res.render('teacher/students', { title: 'My Students', students: teacher.studentsAsTeacher });
};

exports.showStudentProgress = async (req, res) => {
    const { studentId, subjectId } = req.params;
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    const progress = await prisma.progress.findMany({
        where: { studentId, subjectId },
        orderBy: { createdAt: 'desc' }
    });
    res.render('teacher/progress', { title: 'Student Progress', student, subject, progress });
};

exports.addOrUpdateProgress = async (req, res) => {
    const { studentId, subjectId } = req.params;
    const { notes, percentage } = req.body;

    // In a real app, you'd have more robust logic to either create or update.
    // For simplicity, we'll just create a new record each time.
    await prisma.progress.create({
        data: {
            notes,
            percentage: parseInt(percentage, 10),
            studentId,
            subjectId,
            authorId: req.user.id
        }
    });

    res.redirect(`/teacher/students/${studentId}/subjects/${subjectId}/progress`);
};