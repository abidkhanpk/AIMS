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
    
    // Get all active teachers with pay rates
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        isActive: true,
        payRate: {
          gt: 0
        },
        payType: 'monthly' // Only for monthly paid teachers
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
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
    let errors = 0;

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

        if (!existingSalary && teacher.admin) {
          // Create monthly salary
          const dueDate = new Date(currentYear, currentMonth - 1, 25); // Due on 25th of each month
          const currency = teacher.admin.settings?.defaultCurrency || 'USD';
          
          await prisma.salary.create({
            data: {
              teacherId: teacher.id,
              title: `Monthly Salary - ${currentMonth}/${currentYear}`,
              description: `Monthly salary for ${teacher.name} - ${currentMonth}/${currentYear}`,
              amount: teacher.payRate!,
              currency,
              dueDate,
              month: currentMonth,
              year: currentYear,
              isRecurring: true,
            }
          });

          // Create notification for admin
          await prisma.notification.create({
            data: {
              type: 'SALARY_PAID',
              title: 'Monthly Salary Generated',
              message: `Monthly salary of ${currency} ${teacher.payRate} has been generated for ${teacher.name}. Due date: ${dueDate.toLocaleDateString()}`,
              senderId: teacher.admin.id,
              receiverId: teacher.admin.id,
            }
          });

          // Create notification for teacher
          await prisma.notification.create({
            data: {
              type: 'SALARY_PAID',
              title: 'Salary Due',
              message: `Your monthly salary of ${currency} ${teacher.payRate} is due on ${dueDate.toLocaleDateString()}`,
              senderId: teacher.admin.id,
              receiverId: teacher.id,
            }
          });

          salariesCreated++;
        }
      } catch (error) {
        console.error(`Error creating salary for teacher ${teacher.id}:`, error);
        errors++;
      }
    }

    res.status(200).json({
      message: 'Monthly salary generation completed',
      salariesCreated,
      errors,
      totalTeachers: teachers.length,
    });
  } catch (error) {
    console.error('Error in monthly salary generation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}