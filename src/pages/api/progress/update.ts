import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { AttendanceStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only teachers can update progress
  if (session.user.role !== 'TEACHER') {
    return res.status(403).json({ message: 'Only teachers can update progress' });
  }

  const { 
    studentId, 
    courseId, 
    lesson, 
    homework, 
    lessonProgress, 
    score, 
    remarks,
    attendance = 'PRESENT' // Default to PRESENT if not provided
  } = req.body;

  if (!studentId || !courseId) {
    return res.status(400).json({ message: 'Student ID and Course ID are required' });
  }

  // Validate attendance status
  const validAttendanceStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  if (!validAttendanceStatuses.includes(attendance)) {
    return res.status(400).json({ message: 'Invalid attendance status' });
  }

  try {
    // Verify the teacher is assigned to this student
    const teacherStudent = await prisma.teacherStudent.findFirst({
      where: {
        teacherId: session.user.id,
        studentId: studentId
      }
    });

    if (!teacherStudent) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    // Verify the student is enrolled in this course
    const studentCourse = await prisma.studentCourse.findFirst({
      where: {
        studentId: studentId,
        courseId: courseId
      }
    });

    if (!studentCourse) {
      return res.status(404).json({ message: 'Student is not enrolled in this course' });
    }

    // Create progress record
    const progress = await prisma.progress.create({
      data: {
        studentId,
        courseId,
        teacherId: session.user.id,
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
        }
      }
    });

    // Create notifications for parents
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId },
      include: { parent: true }
    });

    for (const parentStudent of parentStudents) {
      await prisma.notification.create({
        data: {
          type: 'PROGRESS_UPDATE',
          title: 'Progress Update',
          message: `New progress update for ${progress.student.name} in ${progress.course.name}. Attendance: ${attendance}${lesson ? `, Lesson: ${lesson}` : ''}${score ? `, Score: ${score}` : ''}`,
          senderId: session.user.id,
          receiverId: parentStudent.parent.id,
        }
      });
    }

    res.status(201).json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}