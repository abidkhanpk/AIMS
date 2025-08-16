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
    return res.status(403).json({ message: 'Only admins can assign teachers' });
  }

  const { studentId, teacherId } = req.body;

  if (!studentId || !teacherId) {
    return res.status(400).json({ message: 'Student ID and Teacher ID are required' });
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

    // Verify teacher belongs to this admin
    const teacher = await prisma.user.findFirst({
      where: {
        id: teacherId,
        adminId: session.user.id,
        role: 'TEACHER'
      }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found or not managed by you' });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.teacherStudent.findFirst({
      where: {
        teacherId,
        studentId
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'Teacher is already assigned to this student' });
    }

    // Create assignment
    const assignment = await prisma.teacherStudent.create({
      data: {
        teacherId,
        studentId
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning teacher:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}