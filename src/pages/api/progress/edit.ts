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

  const { 
    id, 
    lesson, 
    homework, 
    lessonProgress, 
    remarks, 
    attendance,
    date 
  } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Progress ID is required' });
  }

  try {
    // First, verify the progress record exists and user has permission to edit it
    const existingProgress = await prisma.progress.findUnique({
      where: { id },
      include: {
        student: true,
        teacher: true,
        course: true
      }
    });

    if (!existingProgress) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    // Check permissions
    let hasPermission = false;
    
    if (session.user.role === 'ADMIN') {
      // Admin can edit progress for their students
      hasPermission = existingProgress.student.adminId === session.user.id;
    } else if (session.user.role === 'TEACHER') {
      // Teacher can edit progress they created
      hasPermission = existingProgress.teacherId === session.user.id;
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update the progress record
    const updateData: Record<string, any> = {};

    if (lesson !== undefined) updateData.lesson = lesson || null;
    if (homework !== undefined) updateData.homework = homework || null;
    if (lessonProgress !== undefined) {
      const parsed = lessonProgress === null || lessonProgress === '' ? null : parseFloat(lessonProgress);
      if (parsed !== null && Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'Invalid lesson progress value' });
      }
      updateData.lessonProgress = parsed;
    }
    if (remarks !== undefined) updateData.remarks = remarks || null;
    if (attendance !== undefined) updateData.attendance = attendance;
    if (date !== undefined) updateData.date = new Date(date);

    const updatedProgress = await prisma.progress.update({
      where: { id },
      data: { ...updateData, updatedAt: new Date() },
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
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
          }
        },
        parentRemarks: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Create notification for parents about the progress update
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: existingProgress.studentId },
      include: { parent: true }
    });

    for (const parentStudent of parentStudents) {
      await prisma.notification.create({
        data: {
          type: 'PROGRESS_UPDATE',
          title: 'Progress Updated',
          message: `Progress for ${existingProgress.student.name} in ${existingProgress.course.name} has been updated`,
          senderId: session.user.id,
          receiverId: parentStudent.parent.id,
        }
      });
    }

    res.status(200).json(updatedProgress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
