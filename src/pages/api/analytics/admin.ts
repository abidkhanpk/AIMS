import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const adminId = session.user.id;

    // 1. Total Students
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT', adminId, isActive: true },
    });

    // 2. Attendance Rate
    const totalProgress = await prisma.progress.count({
      where: { student: { adminId } }
    });
    const presentProgress = await prisma.progress.count({
      where: { student: { adminId }, attendance: 'PRESENT' }
    });
    const attendanceRate = totalProgress > 0 
      ? Math.round((presentProgress / totalProgress) * 100) 
      : 0;

    // 3. Fee Collection Rate
    const totalFees = await prisma.fee.aggregate({
      where: { student: { adminId } },
      _sum: { amount: true },
    });
    
    const collectedFees = await prisma.fee.aggregate({
      where: { student: { adminId }, status: 'PAID' },
      _sum: { amount: true },
    });

    const feeCollectionRate = totalFees._sum.amount 
      ? Math.round((collectedFees._sum.amount! / totalFees._sum.amount) * 100) 
      : 0;

    // 4. Revenue Chart (Last 6 Months)
    // We group paid fees by month.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const paidFees = await prisma.fee.findMany({
      where: { 
        student: { adminId }, 
        status: 'PAID',
        paidDate: { gte: sixMonthsAgo }
      },
      select: { amount: true, paidDate: true }
    });

    // Grouping logic
    const revenueByMonth = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('default', { month: 'short' });
      revenueByMonth.set(monthStr, 0);
    }

    paidFees.forEach(fee => {
      if (fee.paidDate) {
        const monthStr = new Date(fee.paidDate).toLocaleString('default', { month: 'short' });
        if (revenueByMonth.has(monthStr)) {
          revenueByMonth.set(monthStr, revenueByMonth.get(monthStr) + fee.amount);
        }
      }
    });

    const revenueChart = Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({
      name: month,
      revenue
    }));

    // Respond
    res.status(200).json({
      totalStudents,
      attendanceRate,
      feeCollectionRate,
      revenueChart,
    });

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
