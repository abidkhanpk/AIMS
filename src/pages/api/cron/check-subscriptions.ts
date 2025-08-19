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
    
    // Find all active subscriptions that have expired
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: currentDate
        }
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          }
        }
      }
    });

    let subscriptionsExpired = 0;
    let adminsDisabled = 0;
    let errors = 0;

    for (const subscription of expiredSubscriptions) {
      try {
        // Mark subscription as expired
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' }
        });

        subscriptionsExpired++;

        // Disable admin account if it's still active
        if (subscription.admin.isActive) {
          await prisma.user.update({
            where: { id: subscription.admin.id },
            data: { isActive: false }
          });

          adminsDisabled++;

          // Create notification for admin
          await prisma.notification.create({
            data: {
              type: 'SUBSCRIPTION_DUE',
              title: 'Subscription Expired',
              message: `Your subscription has expired on ${subscription.endDate?.toLocaleDateString()}. Your account has been disabled. Please contact support to renew your subscription.`,
              senderId: subscription.admin.id, // Self-notification
              receiverId: subscription.admin.id,
            }
          });

          // Also disable all users under this admin
          await prisma.user.updateMany({
            where: {
              adminId: subscription.admin.id,
              role: {
                in: ['TEACHER', 'PARENT', 'STUDENT']
              }
            },
            data: { isActive: false }
          });
        }
      } catch (error) {
        console.error(`Error processing expired subscription ${subscription.id}:`, error);
        errors++;
      }
    }

    // Also check for subscriptions expiring in 7 days and send warnings
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 7);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: currentDate,
          lte: warningDate
        }
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    let warningsSent = 0;

    for (const subscription of expiringSubscriptions) {
      try {
        // Check if warning notification already sent today
        const existingWarning = await prisma.notification.findFirst({
          where: {
            receiverId: subscription.admin.id,
            type: 'SUBSCRIPTION_DUE',
            title: 'Subscription Expiring Soon',
            createdAt: {
              gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
            }
          }
        });

        if (!existingWarning) {
          await prisma.notification.create({
            data: {
              type: 'SUBSCRIPTION_DUE',
              title: 'Subscription Expiring Soon',
              message: `Your subscription will expire on ${subscription.endDate?.toLocaleDateString()}. Please renew to avoid service interruption.`,
              senderId: subscription.admin.id,
              receiverId: subscription.admin.id,
            }
          });

          warningsSent++;
        }
      } catch (error) {
        console.error(`Error sending warning for subscription ${subscription.id}:`, error);
        errors++;
      }
    }

    res.status(200).json({
      message: 'Subscription check completed',
      subscriptionsExpired,
      adminsDisabled,
      warningsSent,
      errors,
      totalExpiredSubscriptions: expiredSubscriptions.length,
      totalExpiringSubscriptions: expiringSubscriptions.length,
    });
  } catch (error) {
    console.error('Error in subscription check:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}