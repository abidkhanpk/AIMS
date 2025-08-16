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

  const { studentId, courseId } = req.query;

  try {
    let progressRecords;

    if (session.user.role === 'ADMIN') {
      // Admins can see progress for their managed students
      const whereClause: any = {
        student: {
          adminId: session.user.id
        }
      };

      if (studentId) whereClause.studentId = studentId as string;
      if (courseId) whereClause.courseId = courseId as string;

      progressRecords = await prisma.progress.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          course: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (session.user.role === 'TEACHER') {
      // Teachers can see progress for their assigned students
      const whereClause: any = {
        teacherId: session.user.id
      };

      if (studentId) whereClause.studentId = studentId as string;
      if (courseId) whereClause.courseId = courseId as string;

      progressRecords = await prisma.progress.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          course: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.status(200).json(progressRecords);
  } catch (error) {
    console.error('Error fetching progress records:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}