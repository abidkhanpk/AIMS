import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { AttendanceStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only teachers and admins can edit progress records' });
  }

  const { id, lesson, homework, lessonProgress, score, remarks, attendance } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Progress record ID is required' });
  }

  try {
    // Verify access to the progress record
    let existingProgress;
    
    if (session.user.role === 'TEACHER') {
      // Teacher can only edit their own progress records
      existingProgress = await prisma.progress.findFirst({
        where: {
          id: id,
          teacherId: session.user.id
        }
      });
    } else if (session.user.role === 'ADMIN') {
      // Admin can edit progress records for their students
      existingProgress = await prisma.progress.findFirst({
        where: {
          id: id,
          student: {
            adminId: session.user.id
          }
        }
      });
    }

    if (!existingProgress) {
      return res.status(404).json({ message: 'Progress record not found or access denied' });
    }

    const updatedProgress = await prisma.progress.update({
      where: { id: id },
      data: {
        lesson: lesson || null,
        homework: homework || null,
        lessonProgress: lessonProgress ? parseFloat(lessonProgress) : null,
        score: score ? parseFloat(score) : null,
        remarks: remarks || null,
        attendance: attendance as AttendanceStatus,
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

    res.status(200).json(updatedProgress);
  } catch (error) {
    console.error('Error updating progress record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}