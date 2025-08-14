const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.viewMyProgress = async (req, res) => {
    const student = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            subjects: true,
            progress: {
                orderBy: { createdAt: 'desc' },
                include: { subject: true }
            }
        }
    });
    res.render('student/progress', { title: 'My Progress', student });
};