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

  if (session.user.role !== 'TEACHER') {
    return res.status(403).json({ message: 'Only teachers can update progress' });
  }

  const { studentId, courseId, text, percent } = req.body;

  if (!studentId || !courseId) {
    return res.status(400).json({ message: 'Student ID and Course ID are required' });
  }

  if (!text && percent === undefined) {
    return res.status(400).json({ message: 'Either text or percent must be provided' });
  }

  try {
    // Verify teacher is assigned to this student
    const teacherAssignment = await prisma.teacherStudent.findFirst({
      where: {
        teacherId: session.user.id,
        studentId
      }
    });

    if (!teacherAssignment) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    // Verify student is assigned to this course
    const studentCourse = await prisma.studentCourse.findFirst({
      where: {
        studentId,
        courseId
      }
    });

    if (!studentCourse) {
      return res.status(404).json({ message: 'Student is not assigned to this course' });
    }

    // Create progress record
    const progress = await prisma.progress.create({
      data: {
        studentId,
        courseId,
        teacherId: session.user.id,
        text: text || null,
        percent: percent !== undefined ? parseFloat(percent) : null,
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
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    res.status(201).json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}