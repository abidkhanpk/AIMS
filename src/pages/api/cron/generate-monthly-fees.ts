import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Simple API key check for cron job security
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.CRON_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Get all active assignments with monthly fees
    const assignments = await prisma.assignment.findMany({
      where: {
        isActive: true,
        monthlyFee: {
          gt: 0
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            adminId: true,
          }
        },
        course: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    let feesCreated = 0;
    let errors = 0;

    for (const assignment of assignments) {
      try {
        // Check if fee already exists for this month
        const existingFee = await prisma.fee.findFirst({
          where: {
            studentId: assignment.studentId,
            courseId: assignment.courseId,
            month: currentMonth,
            year: currentYear,
            isRecurring: true,
          }
        });

        if (!existingFee) {
          // Create monthly fee
          const dueDate = new Date(currentYear, currentMonth - 1, 5); // Due on 5th of each month
          
          await prisma.fee.create({
            data: {
              studentId: assignment.studentId,
              courseId: assignment.courseId,
              title: `${assignment.course.name} - Monthly Fee`,
              description: `Monthly fee for ${assignment.course.name} subject - ${currentMonth}/${currentYear}`,
              amount: assignment.monthlyFee!,
              currency: assignment.currency,
              dueDate,
              month: currentMonth,
              year: currentYear,
              isRecurring: true,
            }
          });

          // Create notification for parents
          const parentStudents = await prisma.parentStudent.findMany({
            where: { studentId: assignment.studentId },
            include: { parent: true }
          });

          for (const parentStudent of parentStudents) {
            await prisma.notification.create({
              data: {
                type: 'FEE_DUE',
                title: 'Monthly Fee Generated',
                message: `Monthly fee of ${assignment.currency} ${assignment.monthlyFee} for ${assignment.course.name} has been generated for ${assignment.student.name}. Due date: ${dueDate.toLocaleDateString()}`,
                senderId: assignment.student.adminId!,
                receiverId: parentStudent.parent.id,
              }
            });
          }

          feesCreated++;
        }
      } catch (error) {
        console.error(`Error creating fee for assignment ${assignment.id}:`, error);
        errors++;
      }
    }

    res.status(200).json({
      message: 'Monthly fee generation completed',
      feesCreated,
      errors,
      totalAssignments: assignments.length,
    });
  } catch (error) {
    console.error('Error in monthly fee generation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}