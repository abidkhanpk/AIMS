import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Ensure user is authenticated and is a DEVELOPER
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Only developers can access this endpoint' });
  }

  const { adminId } = req.query;
  if (!adminId || typeof adminId !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid adminId parameter' });
  }

  try {
    // 1. Get total counts
    const [studentsCount, teachersCount, parentsCount, coursesCount] = await Promise.all([
      prisma.user.count({ where: { adminId, role: 'STUDENT' } }),
      prisma.user.count({ where: { adminId, role: 'TEACHER' } }),
      prisma.user.count({ where: { adminId, role: 'PARENT' } }),
      prisma.course.count({ where: { adminId } })
    ]);

    // 2. Fetch all creation dates to build over-time metrics
    const [students, teachers, parents, courses] = await Promise.all([
      prisma.user.findMany({
        where: { adminId, role: 'STUDENT' },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.user.findMany({
        where: { adminId, role: 'TEACHER' },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.user.findMany({
        where: { adminId, role: 'PARENT' },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.course.findMany({
        where: { adminId },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // 3. Find the minimum creation date to start trend line
    const allDates = [
      ...students.map(s => s.createdAt),
      ...teachers.map(t => t.createdAt),
      ...parents.map(p => p.createdAt),
      ...courses.map(c => c.createdAt)
    ];

    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5); // Default to last 6 months
    
    if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      // Ensure we don't start at a invalid date
      if (!isNaN(minDate.getTime())) {
        startDate = minDate;
      }
    }

    // Set startDate to beginning of its month
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    // Generate monthly buckets up to today
    const now = new Date();
    const buckets: { year: number; month: number; label: string }[] = [];
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (current <= now) {
      buckets.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        label: current.toLocaleString('default', { month: 'short', year: 'numeric' })
      });
      current.setMonth(current.getMonth() + 1);
    }

    // 4. Calculate cumulative counts for each monthly bucket
    const overTime = buckets.map(bucket => {
      // Last second of this bucket month
      const endOfMonth = new Date(bucket.year, bucket.month + 1, 0, 23, 59, 59, 999);

      const sc = students.filter(s => s.createdAt <= endOfMonth).length;
      const tc = teachers.filter(t => t.createdAt <= endOfMonth).length;
      const pc = parents.filter(p => p.createdAt <= endOfMonth).length;
      const cc = courses.filter(c => c.createdAt <= endOfMonth).length;

      return {
        name: bucket.label,
        Students: sc,
        Teachers: tc,
        Parents: pc,
        Courses: cc
      };
    });

    return res.status(200).json({
      students: studentsCount,
      teachers: teachersCount,
      parents: parentsCount,
      courses: coursesCount,
      overTime
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
