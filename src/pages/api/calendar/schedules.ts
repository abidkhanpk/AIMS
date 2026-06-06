import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { role, id, adminId } = session.user;

  try {
    let whereClause: any = {
      isActive: true,
      classDays: { isEmpty: false },
      startTime: { not: null }
    };

    if (role === 'ADMIN') {
      whereClause.student = { adminId: id };
    } else if (role === 'TEACHER') {
      whereClause.teacherId = id;
    } else if (role === 'STUDENT') {
      whereClause.studentId = id;
    } else if (role === 'PARENT') {
      // Find children
      const parentStudents = await prisma.parentStudent.findMany({
        where: { parentId: id },
        select: { studentId: true }
      });
      const studentIds = parentStudents.map(ps => ps.studentId);
      whereClause.studentId = { in: studentIds };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        student: { select: { name: true } },
        teacher: { select: { name: true } },
        course: { select: { name: true } }
      }
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching calendar schedules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
