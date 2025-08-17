import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can update subjects' });
  }

  const { id, name, description } = req.body;

  if (!id || !name) {
    return res.status(400).json({ message: 'Subject ID and name are required' });
  }

  try {
    // Verify subject belongs to this admin
    const existingSubject = await prisma.course.findFirst({
      where: {
        id: id,
        adminId: session.user.id
      }
    });

    if (!existingSubject) {
      return res.status(404).json({ message: 'Subject not found or access denied' });
    }

    const updatedSubject = await prisma.course.update({
      where: { id: id },
      data: {
        name,
        description: description || null,
      },
      include: {
        _count: {
          select: {
            studentCourses: true
          }
        }
      }
    });

    res.status(200).json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}