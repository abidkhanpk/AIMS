import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER' && session.user.role !== 'STUDENT')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { studentId, term } = req.query; // optional filtering

  try {
    let studentFilter: any = {};
    if (session.user.role === 'STUDENT') {
      studentFilter.id = session.user.id;
    } else if (session.user.role === 'ADMIN') {
      studentFilter.adminId = session.user.id;
      if (studentId) studentFilter.id = studentId;
    } else if (session.user.role === 'TEACHER') {
      // Teachers can only view report cards of their assigned students
      // We'll filter students who have assignments with this teacher
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: session.user.id },
        select: { studentId: true }
      });
      const ids = assignments.map(a => a.studentId);
      studentFilter.id = { in: ids };
      if (studentId && ids.includes(studentId as string)) studentFilter.id = studentId;
    }

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', ...studentFilter },
      select: {
        id: true,
        name: true,
        email: true,
        // Include assignments to get the courses
        studentCourses: {
          include: {
            course: { select: { id: true, name: true } },
            teacher: { select: { name: true } }
          }
        },
        progressRecords: {
          orderBy: { createdAt: 'desc' },
          take: 50 // latest progress
        },
        testRecords: {
          orderBy: { performedAt: 'desc' }
        }
      }
    });

    // Map students into Report Cards
    const reportCards = students.map(student => {
      const courses = student.studentCourses.map(sc => {
        // Find latest progress
        const latestProgress = student.progressRecords.find(p => p.courseId === sc.course.id);
        // Find tests for this course
        const tests = student.testRecords.filter(t => t.courseId === sc.course.id);
        const avgScore = tests.length > 0 
          ? tests.reduce((sum, t) => sum + ((t.obtainedMarks / t.maxMarks) * 100), 0) / tests.length
          : null;

        return {
          courseName: sc.course.name,
          teacherName: sc.teacher.name,
          latestProgress: latestProgress ? latestProgress.lessonProgress : null,
          averageTestScore: avgScore ? Math.round(avgScore) : null,
          recentTests: tests.slice(0, 3).map(t => ({
            title: t.title,
            score: Math.round((t.obtainedMarks / t.maxMarks) * 100),
            date: t.performedAt
          }))
        };
      });

      return {
        studentId: student.id,
        studentName: student.name,
        email: student.email,
        courses
      };
    });

    res.status(200).json(reportCards);
  } catch (error) {
    console.error('Error fetching report cards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
