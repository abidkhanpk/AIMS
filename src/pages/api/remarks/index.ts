import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { role, id, adminId } = session.user;

  try {
    let remarks;
    if (role === 'ADMIN') {
      remarks = await prisma.parentRemark.findMany({
        where: { progress: { student: { adminId: id } } },
        include: {
          parent: { select: { id: true, name: true } },
          progress: {
            select: {
              id: true,
              course: { select: { id: true, name: true } },
              student: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } },
              date: true,
            },
          },
          replies: {
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'TEACHER') {
      remarks = await prisma.parentRemark.findMany({
        where: { progress: { teacherId: id } },
        include: {
          parent: { select: { id: true, name: true } },
          progress: {
            select: {
              id: true,
              course: { select: { id: true, name: true } },
              student: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } },
              date: true,
            },
          },
          replies: {
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ message: 'Only admins and teachers can view remarks' });
    }

    return res.status(200).json(remarks || []);
  } catch (error) {
    console.error('Error fetching remarks:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
