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
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // Check for fee due date reminders
    const upcomingFees = await prisma.fee.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gte: new Date(),
          lte: oneWeekFromNow,
        },
      },
      include: {
        student: {
          include: {
            studentParents: {
              include: {
                parent: true
              }
            }
          }
        }
      }
    });

    // Send fee reminders to parents
    for (const fee of upcomingFees) {
      for (const parentStudent of fee.student.studentParents) {
        await prisma.notification.create({
          data: {
            type: 'FEE_DUE',
            title: 'Fee Due Reminder',
            message: `Reminder: Fee "${fee.title}" of ${fee.currency} ${fee.amount} for ${fee.student.name} is due on ${fee.dueDate.toLocaleDateString()}`,
            senderId: fee.student.adminId || 'system',
            receiverId: parentStudent.parent.id,
          }
        });
      }
    }

    // Check for subscription due date reminders
    const upcomingSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
          lte: oneWeekFromNow,
        },
      },
      include: {
        admin: true
      }
    });

    // Send subscription reminders to admins
    for (const subscription of upcomingSubscriptions) {
      await prisma.notification.create({
        data: {
          type: 'SUBSCRIPTION_DUE',
          title: 'Subscription Renewal Reminder',
          message: `Reminder: Your ${subscription.plan.toLowerCase()} subscription of ${subscription.currency} ${subscription.amount} expires on ${subscription.endDate.toLocaleDateString()}. Please renew to continue using the service.`,
          senderId: 'system',
          receiverId: subscription.adminId,
        }
      });
    }

    res.status(200).json({ 
      message: 'Reminders sent successfully',
      feeReminders: upcomingFees.length,
      subscriptionReminders: upcomingSubscriptions.length
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}