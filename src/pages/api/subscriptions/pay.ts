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

  // Only admins can pay subscriptions
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can pay subscriptions' });
  }

  const { subscriptionId, paidAmount, paymentDetails, paymentProof } = req.body;

  if (!subscriptionId || !paidAmount) {
    return res.status(400).json({ message: 'Subscription ID and paid amount are required' });
  }

  try {
    // Verify subscription belongs to this admin
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        adminId: session.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found or access denied' });
    }

    if (subscription.status === 'PAID') {
      return res.status(400).json({ message: 'Subscription is already paid' });
    }

    // Update subscription with payment details
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        paidAmount: parseFloat(paidAmount),
        paidDate: new Date(),
        paymentDetails: paymentDetails || null,
        paymentProof: paymentProof || null,
        paidById: session.user.id,
        status: 'PROCESSING',
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

    res.status(200).json(updatedSubscription);
  } catch (error) {
    console.error('Error processing subscription payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}