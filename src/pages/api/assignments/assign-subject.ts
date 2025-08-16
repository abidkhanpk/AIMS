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
    return res.status(403).json({ message: 'Only admins can assign subjects' });
  }

  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    return res.status(400).json({ message: 'Student ID and Course ID are required' });
  }

  try {
    // Verify student belongs to this admin
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        adminId: session.user.id,
        role: 'STUDENT'
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found or not managed by you' });
    }

    // Verify course belongs to this admin
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        adminId: session.user.id
      }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not created by you' });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.studentCourse.findFirst({
      where: {
        studentId,
        courseId
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'Student is already assigned to this course' });
    }

    // Create assignment
    const assignment = await prisma.studentCourse.create({
      data: {
        studentId,
        courseId
      },
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
        }
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning subject:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}