import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only developers can verify subscription payments
  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Only developers can verify subscription payments' });
  }

  const { subscriptionId, approved } = req.body;

  if (!subscriptionId || typeof approved !== 'boolean') {
    return res.status(400).json({ message: 'Subscription ID and approval status are required' });
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
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

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (subscription.status !== 'PROCESSING') {
      return res.status(400).json({ message: 'Subscription is not in processing status' });
    }

    const newStatus = approved ? 'ACTIVE' : 'PENDING';
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: newStatus,
        processedDate: new Date(),
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Create notification for admin
    const notificationType = approved ? 'SUBSCRIPTION_PAID' : 'PAYMENT_PROCESSING';
    const notificationTitle = approved ? 'Subscription Payment Verified' : 'Subscription Payment Rejected';
    const notificationMessage = approved 
      ? `Your ${subscription.plan.toLowerCase()} subscription payment has been verified and approved. Your subscription is now active.`
      : `Your ${subscription.plan.toLowerCase()} subscription payment has been rejected. Please contact support or resubmit payment.`;

    await prisma.notification.create({
      data: {
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        senderId: session.user.id,
        receiverId: subscription.adminId,
      }
    });

    res.status(200).json(updatedSubscription);
  } catch (error) {
    console.error('Error verifying subscription payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}