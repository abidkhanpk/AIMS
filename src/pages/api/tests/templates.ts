import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { AssessmentType, Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const role = session.user.role as Role;

  if (req.method === 'GET') {
    if (!['ADMIN', 'TEACHER'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and teachers can view exam templates' });
    }

    const adminId = role === 'ADMIN' ? session.user.id : session.user.adminId;
    if (!adminId) {
      return res.status(400).json({ message: 'Admin context not found for this user' });
    }

    try {
      const templates = await prisma.examTemplate.findMany({
        where: { adminId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching exam templates:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    if (!['ADMIN', 'TEACHER'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and teachers can create exam templates' });
    }

    const { title, description, type = 'TEST', courseId, maxMarks, scheduledDate } = req.body;

    if (!title || !maxMarks) {
      return res.status(400).json({ message: 'Title and maximum marks are required' });
    }

    if (!['TEST', 'EXAM'].includes(type)) {
      return res.status(400).json({ message: 'Invalid assessment type' });
    }

    const adminId = role === 'ADMIN' ? session.user.id : session.user.adminId;
    if (!adminId) {
      return res.status(400).json({ message: 'Admin context not found for this user' });
    }

    try {
      if (courseId) {
        const course = await prisma.course.findFirst({
          where: { id: courseId, adminId },
          select: { id: true }
        });

        if (!course) {
          return res.status(404).json({ message: 'Course not found for this admin' });
        }
      }

      const template = await prisma.examTemplate.create({
        data: {
          title,
          description: description || null,
          type: type as AssessmentType,
          courseId: courseId || null,
          maxMarks: parseFloat(maxMarks),
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          adminId,
          createdById: session.user.id,
        },
      });

      return res.status(201).json(template);
    } catch (error) {
      console.error('Error creating exam template:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
