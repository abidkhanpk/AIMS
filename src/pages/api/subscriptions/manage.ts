import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      if (session.user.role === 'DEVELOPER') {
        // Developer can see all admin subscriptions
        const subscriptions = await prisma.subscription.findMany({
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Also get subscription payments
        const payments = await prisma.subscriptionPayment.findMany({
          orderBy: {
            createdAt: 'desc'
          }
        });

        res.status(200).json({ subscriptions, payments });
      } else if (session.user.role === 'ADMIN') {
        // Admin can see their own subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            adminId: session.user.id
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        const payments = await prisma.subscriptionPayment.findMany({
          where: {
            adminId: session.user.id
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        res.status(200).json({ subscription, payments });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Enable/extend admin subscription
    if (session.user.role !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Only developers can manage subscriptions' });
    }

    const { adminId, action, plan } = req.body;

    if (!adminId || !action) {
      return res.status(400).json({ message: 'Admin ID and action are required' });
    }

    try {
      // Get admin details
      const admin = await prisma.user.findFirst({
        where: {
          id: adminId,
          role: 'ADMIN'
        },
        include: {
          settings: true
        }
      });

      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      // Get current subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: {
          adminId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (action === 'enable' || action === 'extend') {
        if (!plan) {
          return res.status(400).json({ message: 'Subscription plan is required' });
        }

        // Get app settings for pricing
        const appSettings = await prisma.appSettings.findFirst();
        let amount = 0;
        
        switch (plan) {
          case 'MONTHLY':
            amount = appSettings?.monthlyPrice || 29.99;
            break;
          case 'YEARLY':
            amount = appSettings?.yearlyPrice || 299.99;
            break;
          case 'LIFETIME':
            amount = appSettings?.lifetimePrice || 999.99;
            break;
        }

        // Calculate new dates
        const currentDate = new Date();
        let startDate = currentDate;
        let endDate = null;

        if (currentSubscription && currentSubscription.endDate && currentSubscription.endDate > currentDate) {
          // Extend from current end date
          startDate = currentSubscription.endDate;
        }

        if (plan !== 'LIFETIME') {
          endDate = new Date(startDate);
          if (plan === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else if (plan === 'YEARLY') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }
        }

        // Create new subscription
        const newSubscription = await prisma.subscription.create({
          data: {
            adminId,
            plan,
            amount,
            startDate,
            endDate,
            status: 'ACTIVE',
          }
        });

        // Update admin status
        await prisma.user.update({
          where: { id: adminId },
          data: { isActive: true }
        });

        // Update settings
        await prisma.settings.update({
          where: { adminId },
          data: {
            subscriptionType: plan,
            subscriptionAmount: amount,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
          }
        });

        // Create payment record
        await prisma.subscriptionPayment.create({
          data: {
            adminId,
            subscriptionId: newSubscription.id,
            amount,
            plan,
            paymentDate: currentDate,
            expiryExtended: endDate || new Date('2099-12-31'), // Far future for lifetime
            paymentDetails: `Subscription ${action} by developer`,
            processedById: session.user.id,
          }
        });

        // Create notification for admin
        await prisma.notification.create({
          data: {
            type: 'SUBSCRIPTION_PAID',
            title: 'Subscription Updated',
            message: `Your ${plan.toLowerCase()} subscription has been ${action}d. ${endDate ? `Valid until ${endDate.toLocaleDateString()}` : 'Lifetime access granted'}.`,
            senderId: session.user.id,
            receiverId: adminId,
          }
        });

        res.status(200).json({
          message: `Subscription ${action}d successfully`,
          subscription: newSubscription
        });
      } else if (action === 'disable') {
        // Disable admin account
        await prisma.user.update({
          where: { id: adminId },
          data: { isActive: false }
        });

        // Update current subscription status
        if (currentSubscription) {
          await prisma.subscription.update({
            where: { id: currentSubscription.id },
            data: { status: 'EXPIRED' }
          });
        }

        // Create notification for admin
        await prisma.notification.create({
          data: {
            type: 'SUBSCRIPTION_DUE',
            title: 'Account Disabled',
            message: 'Your account has been disabled due to subscription expiry. Please contact support.',
            senderId: session.user.id,
            receiverId: adminId,
          }
        });

        res.status(200).json({
          message: 'Admin account disabled successfully'
        });
      } else {
        return res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}