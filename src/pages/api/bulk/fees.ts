import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ message: 'Unauthorized. Only Admins can generate bulk fees.' });
  }

  const adminId = session.user.id;

  try {
    const { targetMonth } = req.body; // e.g., '2026-06'
    
    if (!targetMonth) {
      return res.status(400).json({ message: 'targetMonth is required (YYYY-MM).' });
    }

    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed
    
    const targetDate = new Date(year, month, 1);
    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);
    const defaultDueDate = addMonths(startDate, 1); // Due 1st of next month

    // Find all active assignments for this admin's academy
    const assignments = await prisma.assignment.findMany({
      where: {
        isActive: true,
        student: { adminId },
      },
      include: {
        student: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } }
      }
    });

    if (assignments.length === 0) {
      return res.status(404).json({ message: 'No active assignments found to generate fees.' });
    }

    let generatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const assignment of assignments) {
      if (!assignment.monthlyFee || assignment.monthlyFee <= 0) {
        skippedCount++;
        continue;
      }

      // Check if fee already exists for this student + course + month
      const existingFee = await prisma.fee.findFirst({
        where: {
          studentId: assignment.studentId,
          month: month + 1,
          year: year,
          description: {
            contains: assignment.course.name
          }
        }
      });

      if (existingFee) {
        skippedCount++;
        continue;
      }

      try {
        await prisma.fee.create({
          data: {
            studentId: assignment.studentId,
            title: `Monthly Tuition - ${format(startDate, 'MMM yyyy')}`,
            amount: assignment.monthlyFee,
            currency: assignment.currency,
            dueDate: defaultDueDate,
            month: month + 1,
            year: year,
            status: 'PENDING',
            description: `Tuition Fee - ${assignment.course.name} (${format(startDate, 'MMM yyyy')})`
          }
        });
        generatedCount++;
      } catch (err: any) {
        errors.push(`Failed for ${assignment.student.name}: ${err.message}`);
      }
    }

    if (generatedCount > 0) {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          actionType: 'BULK_GENERATE_FEES',
          details: `Generated ${generatedCount} fees for ${targetMonth}. Skipped: ${skippedCount}. Errors: ${errors.length}`
        }
      });
    }

    return res.status(200).json({ 
      message: `Generated ${generatedCount} fees. Skipped ${skippedCount} (already exist or no fee amount set).`, 
      generatedCount,
      skippedCount,
      errors 
    });
  } catch (error) {
    console.error('Error in bulk fee generation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
