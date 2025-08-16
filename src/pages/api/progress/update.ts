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

  const { 
    studentId, 
    courseId, 
    date,
    lesson,
    homework,
    lessonProgress,
    score,
    remarks,
    attendance
  } = req.body;

  if (!studentId || !courseId || !attendance) {
    return res.status(400).json({ message: 'Student ID, Course ID, and attendance are required' });
  }

  // Validate attendance value
  const validAttendanceValues = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  if (!validAttendanceValues.includes(attendance)) {
    return res.status(400).json({ message: 'Invalid attendance value' });
  }

  // If student is absent, only attendance should be recorded (no progress data)
  if (attendance === 'ABSENT') {
    if (lesson || homework || lessonProgress !== undefined || score !== undefined || remarks) {
      return res.status(400).json({ message: 'Cannot record progress data when student is absent' });
    }
  } else {
    // For present/late/excused students, at least one progress field should be provided
    if (!lesson && !homework && lessonProgress === undefined && score === undefined && !remarks) {
      return res.status(400).json({ message: 'At least one progress field must be provided for present students' });
    }
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
        date: date ? new Date(date) : new Date(),
        lesson: attendance === 'ABSENT' ? null : (lesson || null),
        homework: attendance === 'ABSENT' ? null : (homework || null),
        lessonProgress: attendance === 'ABSENT' ? null : (lessonProgress !== undefined ? parseFloat(lessonProgress) : null),
        score: attendance === 'ABSENT' ? null : (score !== undefined ? parseFloat(score) : null),
        remarks: attendance === 'ABSENT' ? `Student was absent` : (remarks || null),
        attendance: attendance,
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

    // Create notification for parents (only if there's meaningful progress or if absent)
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId },
      include: { parent: true }
    });

    for (const parentStudent of parentStudents) {
      let notificationMessage;
      
      if (attendance === 'ABSENT') {
        notificationMessage = `${progress.student.name} was marked absent in ${progress.course.name} on ${new Date(progress.date).toLocaleDateString()}`;
      } else {
        notificationMessage = `${progress.teacher.name} updated progress for ${progress.student.name} in ${progress.course.name}`;
        if (attendance === 'LATE') {
          notificationMessage += ` (Student was late)`;
        } else if (attendance === 'EXCUSED') {
          notificationMessage += ` (Excused absence)`;
        }
      }

      await prisma.notification.create({
        data: {
          type: 'PROGRESS_UPDATE',
          title: attendance === 'ABSENT' ? 'Attendance Alert' : 'New Progress Update',
          message: notificationMessage,
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