import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'TEACHER') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const teacherId = session.user.id;

    // 1. Average Test Scores
    const testRecords = await prisma.testRecord.aggregate({
      where: { teacherId },
      _avg: { obtainedMarks: true, maxMarks: true },
    });
    
    const avgScore = testRecords._avg.obtainedMarks && testRecords._avg.maxMarks
      ? Math.round((testRecords._avg.obtainedMarks / testRecords._avg.maxMarks) * 100)
      : 0;

    // 2. Class Attendance Rate
    const totalProgress = await prisma.progress.count({
      where: { teacherId }
    });
    const presentProgress = await prisma.progress.count({
      where: { teacherId, attendance: 'PRESENT' }
    });
    
    const attendanceRate = totalProgress > 0 
      ? Math.round((presentProgress / totalProgress) * 100) 
      : 0;

    // Respond
    res.status(200).json({
      averageTestScore: avgScore,
      attendanceRate,
    });

  } catch (error) {
    console.error('Error fetching teacher analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
