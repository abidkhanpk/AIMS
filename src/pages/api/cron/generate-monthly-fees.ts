import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify cron job authorization (you can add API key verification here)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        },
        student: {
          isActive: true,
          admin: {
            isActive: true
          }
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
    let errors = [];

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
          await prisma.fee.create({
            data: {
              studentId: assignment.studentId,
              courseId: assignment.courseId,
              title: `${assignment.course.name} - Monthly Fee`,
              description: `Monthly fee for ${assignment.course.name} subject for ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
              amount: assignment.monthlyFee!,
              currency: assignment.currency,
              dueDate: new Date(currentYear, currentMonth - 1, 5), // Due on 5th of current month
              month: currentMonth,
              year: currentYear,
              isRecurring: true,
              status: 'PENDING',
            }
          });

          feesCreated++;

          // Create notification for parents
          const parentStudents = await prisma.parentStudent.findMany({
            where: { studentId: assignment.studentId },
            include: { parent: true }
          });

          for (const parentStudent of parentStudents) {
            await prisma.notification.create({
              data: {
                type: 'FEE_DUE',
                title: 'Monthly Fee Due',
                message: `Monthly fee for ${assignment.course.name} (${assignment.currency} ${assignment.monthlyFee}) is due for ${assignment.student.name}`,
                senderId: assignment.student.adminId!,
                receiverId: parentStudent.parent.id,
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error creating fee for assignment ${assignment.id}:`, error);
        errors.push({
          assignmentId: assignment.id,
          studentName: assignment.student.name,
          courseName: assignment.course.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      message: 'Monthly fees generation completed',
      feesCreated,
      totalAssignments: assignments.length,
      errors: errors.length > 0 ? errors : undefined,
      processedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in monthly fees generation:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}