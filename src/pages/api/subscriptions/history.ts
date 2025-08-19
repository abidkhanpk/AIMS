import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only developers can access subscription history
  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (req.method === 'GET') {
    try {
      const { adminId } = req.query;

      if (!adminId || typeof adminId !== 'string') {
        return res.status(400).json({ message: 'Admin ID is required' });
      }

      // Get subscription history for the admin
      const subscriptions = await prisma.subscription.findMany({
        where: { adminId },
        include: {
          admin: {
            select: {
              name: true,
              email: true
            }
          },
          paidBy: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get subscription payments
      const subscriptionPayments = await prisma.subscriptionPayment.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({
        subscriptions,
        payments: subscriptionPayments
      });
    } catch (error) {
      console.error('Get subscription history error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}