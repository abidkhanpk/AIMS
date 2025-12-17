import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { SubscriptionStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only admins can pay subscriptions
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can pay subscriptions' });
  }

  const method = req.method;
  const { subscriptionId, paidAmount, paymentDetails, paymentProof, paidDate } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ message: 'Subscription ID is required' });
  }

  if (method === 'POST' && !paidAmount) {
    return res.status(400).json({ message: 'Paid amount is required' });
  }

  try {
    // Verify subscription belongs to this admin
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        adminId: session.user.id
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

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found or access denied' });
    }

    // Helper to ensure pending edits/deletes only allowed while processing and recent
    const canModifyProcessing = () => {
      if (subscription.status !== SubscriptionStatus.PROCESSING) return false;
      const submittedDate = subscription.paidDate ? new Date(subscription.paidDate) : new Date();
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    };

    if (method === 'POST') {
      if (subscription.status === SubscriptionStatus.ACTIVE && subscription.paidAmount) {
        return res.status(400).json({ message: 'Subscription is already paid' });
      }

      // Update subscription with payment details
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          paidAmount: parseFloat(paidAmount),
          paidDate: paidDate ? new Date(paidDate) : new Date(),
          paymentDetails: paymentDetails || null,
          paymentProof: paymentProof || null,
          paidById: session.user.id,
          status: SubscriptionStatus.PROCESSING,
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

      // Create notification for developer
      const developers = await prisma.user.findMany({
        where: { role: 'DEVELOPER' }
      });

      for (const developer of developers) {
        await prisma.notification.create({
          data: {
            type: 'PAYMENT_PROCESSING',
            title: 'Subscription Payment Submitted',
            message: `${subscription.admin?.name || 'Admin'} has submitted a payment of ${subscription.currency} ${paidAmount} for their ${subscription.plan.toLowerCase()} subscription. Please verify and confirm.`,
            senderId: session.user.id,
            receiverId: developer.id,
          }
        });
      }

      return res.status(200).json(updatedSubscription);
    }

    if (method === 'PUT') {
      if (!canModifyProcessing()) {
        return res.status(400).json({ message: 'Cannot modify payment after it is verified or older than 7 days' });
      }

      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          paidAmount: paidAmount !== undefined ? parseFloat(paidAmount) : subscription.paidAmount,
          paidDate: paidDate ? new Date(paidDate) : subscription.paidDate,
          paymentDetails: paymentDetails !== undefined ? paymentDetails : subscription.paymentDetails,
          paymentProof: paymentProof !== undefined ? paymentProof : subscription.paymentProof,
        }
      });

      return res.status(200).json(updated);
    }

    if (method === 'DELETE') {
      if (!canModifyProcessing()) {
        return res.status(400).json({ message: 'Cannot delete payment after it is verified or older than 7 days' });
      }

      const cleared = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.PENDING,
          paidAmount: null,
          paidDate: null,
          paymentDetails: null,
          paymentProof: null,
          paidById: null,
        }
      });
      return res.status(200).json(cleared);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error processing subscription payment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
