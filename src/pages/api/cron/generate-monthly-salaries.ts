import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { PayType } from '@prisma/client';

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

    // Get all active teachers with pay rates
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        isActive: true,
        payRate: {
          gt: 0
        },
        admin: {
          isActive: true
        }
      },
      select: {
        id: true,
        name: true,
        payRate: true,
        payType: true,
        payCurrency: true,
        adminId: true,
        admin: {
          select: {
            settings: {
              select: {
                defaultCurrency: true
              }
            }
          }
        }
      }
    });

    let salariesCreated = 0;
    let errors = [];

    for (const teacher of teachers) {
      try {
        // Check if salary already exists for this month
        const existingSalary = await prisma.salary.findFirst({
          where: {
            teacherId: teacher.id,
            month: currentMonth,
            year: currentYear,
            isRecurring: true,
          }
        });

        if (!existingSalary && teacher.payRate && teacher.payType === PayType.MONTHLY) {
          const currency = teacher.payCurrency || teacher.admin?.settings?.defaultCurrency || 'USD';

          // Create monthly salary
          await prisma.salary.create({
            data: {
              teacherId: teacher.id,
              title: 'Monthly Salary',
              description: `Monthly salary for ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
              amount: teacher.payRate,
              currency: currency,
              dueDate: new Date(currentYear, currentMonth - 1, 25), // Due on 25th of current month
              month: currentMonth,
              year: currentYear,
              payType: PayType.MONTHLY,
              isRecurring: true,
              status: 'PENDING',
            }
          });

          salariesCreated++;

          // Create notification for admin
          if (teacher.adminId) {
            await prisma.notification.create({
              data: {
                type: 'SALARY_PAID',
                title: 'Monthly Salary Due',
                message: `Monthly salary (${currency} ${teacher.payRate}) is due for teacher ${teacher.name}`,
                senderId: teacher.adminId,
                receiverId: teacher.adminId,
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error creating salary for teacher ${teacher.id}:`, error);
        errors.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      message: 'Monthly salaries generation completed',
      salariesCreated,
      totalTeachers: teachers.length,
      errors: errors.length > 0 ? errors : undefined,
      processedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in monthly salaries generation:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}