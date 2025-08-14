const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listChildrenProgress = async (req, res) => {
    const parent = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            childrenAsParent: {
                include: {
                    subjects: true,
                    progress: {
                        orderBy: { createdAt: 'desc' },
                        include: { subject: true }
                    }
                }
            }
        }
    });
    res.render('parent/children', { title: 'My Children\'s Progress', children: parent.childrenAsParent });
};