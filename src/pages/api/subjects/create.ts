import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can create subjects' });
  }

  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  try {
    const course = await prisma.course.create({
      data: {
        name,
        description: description || '',
        adminId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      }
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}