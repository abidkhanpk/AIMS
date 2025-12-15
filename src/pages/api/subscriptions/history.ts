import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { adminId } = req.query;

      if ((!adminId || typeof adminId !== 'string') && session.user.role !== 'ADMIN') {
        return res.status(400).json({ message: 'Admin ID is required' });
      }

      // Access control:
      // - Developer: can view any adminId (must be provided)
      // - Admin: can only view their own history (adminId optional and defaults to self)
      const targetAdminId =
        session.user.role === 'ADMIN' ? session.user.id : (adminId as string | undefined);

      if (session.user.role !== 'DEVELOPER' && session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (session.user.role === 'DEVELOPER' && !targetAdminId) {
        return res.status(400).json({ message: 'Admin ID is required' });
      }
      if (session.user.role === 'ADMIN' && targetAdminId !== session.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const subscriptions = await prisma.subscription.findMany({
        where: { adminId: targetAdminId },
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
        where: { adminId: targetAdminId },
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
