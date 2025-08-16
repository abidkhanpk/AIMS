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

  try {
    let courses;

    if (session.user.role === 'ADMIN') {
      // Admins can see their created courses
      courses = await prisma.course.findMany({
        where: { adminId: session.user.id },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: {
            select: {
              studentCourses: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (session.user.adminId) {
      // Other users can see courses from their admin
      courses = await prisma.course.findMany({
        where: { adminId: session.user.adminId },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}