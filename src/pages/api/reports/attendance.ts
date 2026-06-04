import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { startDate, endDate, studentId, courseId } = req.query;

  try {
    let whereClause: any = {};

    if (session.user.role === 'ADMIN') {
      whereClause.student = { adminId: session.user.id };
    } else {
      whereClause.teacherId = session.user.id;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (studentId) whereClause.studentId = studentId;
    if (courseId) whereClause.courseId = courseId;

    const progressRecords = await prisma.progress.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(progressRecords);
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
