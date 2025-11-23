import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { AssessmentType, Role } from '@prisma/client';

const includeCommon = {
  student: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const role = session.user.role as Role;

  if (req.method === 'GET') {
    try {
      let records;

      if (role === 'ADMIN') {
        records = await prisma.testRecord.findMany({
          where: { student: { adminId: session.user.id } },
          include: includeCommon,
          orderBy: { performedAt: 'desc' },
        });
      } else if (role === 'TEACHER') {
        const assignments = await prisma.teacherStudent.findMany({
          where: { teacherId: session.user.id },
          select: { studentId: true },
        });
        const studentIds = assignments.map((a) => a.studentId);

        records = await prisma.testRecord.findMany({
          where: studentIds.length > 0 ? { studentId: { in: studentIds } } : { studentId: '' },
          include: includeCommon,
          orderBy: { performedAt: 'desc' },
        });
      } else if (role === 'PARENT') {
        const children = await prisma.parentStudent.findMany({
          where: { parentId: session.user.id },
          select: { studentId: true },
        });
        const studentIds = children.map((c) => c.studentId);

        records = await prisma.testRecord.findMany({
          where: studentIds.length > 0 ? { studentId: { in: studentIds } } : { studentId: '' },
          include: includeCommon,
          orderBy: { performedAt: 'desc' },
        });
      } else if (role === 'STUDENT') {
        records = await prisma.testRecord.findMany({
          where: { studentId: session.user.id },
          include: includeCommon,
          orderBy: { performedAt: 'desc' },
        });
      } else {
        return res.status(403).json({ message: 'Unauthorized role for test records' });
      }

      return res.status(200).json(records || []);
    } catch (error) {
      console.error('Error fetching test records:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    if (role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can record tests' });
    }

    const {
      studentId,
      courseId,
      title,
      type = 'QUIZ',
      performedAt,
      maxMarks,
      obtainedMarks,
      performanceNote,
      remarks,
    } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ message: 'Student and course are required' });
    }

    const validTypes: AssessmentType[] = ['QUIZ', 'EXAM', 'HOMEWORK', 'OTHER'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid assessment type' });
    }

    const parsedMax = maxMarks ? parseFloat(maxMarks) : NaN;
    const parsedObtained = obtainedMarks ? parseFloat(obtainedMarks) : NaN;

    try {
      const assignment = await prisma.teacherStudent.findFirst({
        where: { teacherId: session.user.id, studentId },
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not assigned to this student' });
      }

      const studentCourse = await prisma.studentCourse.findFirst({
        where: { studentId, courseId },
      });
      if (!studentCourse) {
        return res.status(404).json({ message: 'Student is not enrolled in this course' });
      }

      if (!title) {
        return res.status(400).json({ message: 'Please provide a test/exam title' });
      }

      if (Number.isNaN(parsedMax) || parsedMax <= 0) {
        return res.status(400).json({ message: 'Please provide a valid maximum mark' });
      }

      if (Number.isNaN(parsedObtained) || parsedObtained < 0) {
        return res.status(400).json({ message: 'Please provide obtained marks' });
      }

      const percentage = Math.max(0, Math.min(100, (parsedObtained / parsedMax) * 100));

      const record = await prisma.testRecord.create({
        data: {
          studentId,
          courseId,
          teacherId: session.user.id,
          title,
          type,
          performedAt: performedAt ? new Date(performedAt) : new Date(),
          maxMarks: parsedMax,
          obtainedMarks: parsedObtained,
          percentage: parseFloat(percentage.toFixed(2)),
          performanceNote: performanceNote || null,
          remarks: remarks || null,
        },
      });

      return res.status(201).json(record);
    } catch (error) {
      console.error('Error recording test:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
