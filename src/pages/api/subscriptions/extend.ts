import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only developers can extend subscriptions
  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (req.method === 'POST') {
    try {
      const { adminId, plan, amount, currency, paymentDetails } = req.body;

      if (!adminId || !plan || !amount || !currency) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Get current admin subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: { 
          adminId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate new expiry date
      let newExpiryDate = new Date();
      if (currentSubscription && currentSubscription.endDate) {
        // Extend from current expiry date
        newExpiryDate = new Date(currentSubscription.endDate);
      }

      // Add extension period
      switch (plan) {
        case 'MONTHLY':
          newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
          break;
        case 'YEARLY':
          newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
          break;
        case 'LIFETIME':
          newExpiryDate = null; // No expiry for lifetime
          break;
        default:
          return res.status(400).json({ message: 'Invalid subscription plan' });
      }

      // Create subscription payment record
      const subscriptionPayment = await prisma.subscriptionPayment.create({
        data: {
          adminId,
          amount: parseFloat(amount),
          currency,
          plan,
          paymentDate: new Date(),
          expiryExtended: newExpiryDate || new Date('2099-12-31'), // Far future for lifetime
          paymentDetails,
          processedById: session.user.id
        }
      });

      // Update or create subscription
      if (currentSubscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            endDate: newExpiryDate,
            status: 'ACTIVE',
            paidDate: new Date(),
            paidById: session.user.id
          }
        });
      } else {
        // Create new subscription
        await prisma.subscription.create({
          data: {
            adminId,
            plan,
            amount: parseFloat(amount),
            currency,
            startDate: new Date(),
            endDate: newExpiryDate,
            status: 'ACTIVE',
            paidDate: new Date(),
            paidById: session.user.id
          }
        });
      }

      // Update admin settings with new subscription info
      await prisma.settings.upsert({
        where: { adminId },
        update: {
          subscriptionType: plan,
          subscriptionAmount: parseFloat(amount),
          subscriptionStartDate: currentSubscription?.startDate || new Date(),
          subscriptionEndDate: newExpiryDate
        },
        create: {
          adminId,
          subscriptionType: plan,
          subscriptionAmount: parseFloat(amount),
          subscriptionStartDate: new Date(),
          subscriptionEndDate: newExpiryDate
        }
      });

      // Create notification for admin
      await prisma.notification.create({
        data: {
          type: 'SUBSCRIPTION_PAID',
          title: 'Subscription Extended',
          message: `Your subscription has been extended until ${newExpiryDate ? newExpiryDate.toLocaleDateString() : 'lifetime'}`,
          senderId: session.user.id,
          receiverId: adminId
        }
      });

      res.status(200).json({ 
        message: 'Subscription extended successfully',
        newExpiryDate: newExpiryDate?.toISOString(),
        paymentId: subscriptionPayment.id
      });
    } catch (error) {
      console.error('Extend subscription error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}