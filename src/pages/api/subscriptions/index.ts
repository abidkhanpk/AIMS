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
      let subscriptions;

      if (session.user.role === 'DEVELOPER') {
        // Developer can see all subscriptions
        subscriptions = await prisma.subscription.findMany({
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'ADMIN') {
        // Admin can see their own subscriptions
        subscriptions = await prisma.subscription.findMany({
          where: {
            adminId: session.user.id
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.status(200).json(subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Only developers can create subscriptions
    if (session.user.role !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Only developers can create subscriptions' });
    }

    const { adminId, plan, amount, currency, startDate, endDate } = req.body;

    if (!adminId || !plan || !amount || !startDate || !endDate) {
      return res.status(400).json({ message: 'Admin ID, plan, amount, start date, and end date are required' });
    }

    try {
      // Verify admin exists
      const admin = await prisma.user.findFirst({
        where: {
          id: adminId,
          role: 'ADMIN'
        }
      });

      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      const subscription = await prisma.subscription.create({
        data: {
          adminId,
          plan,
          amount: parseFloat(amount),
          currency: currency || 'USD',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
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

      // Create notification for admin
      await prisma.notification.create({
        data: {
          type: 'SUBSCRIPTION_DUE',
          title: 'New Subscription Created',
          message: `A new ${plan.toLowerCase()} subscription of ${currency || 'USD'} ${amount} is due on ${new Date(endDate).toLocaleDateString()}`,
          senderId: session.user.id,
          receiverId: adminId,
        }
      });

      res.status(201).json(subscription);
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Only developers can update subscriptions
    if (session.user.role !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Only developers can update subscriptions' });
    }

    const { id, plan, amount, currency, startDate, endDate, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Subscription ID is required' });
    }

    try {
      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: {
          ...(plan && { plan }),
          ...(amount && { amount: parseFloat(amount) }),
          ...(currency && { currency }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(status && { status }),
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

      res.status(200).json(updatedSubscription);
    } catch (error) {
      console.error('Error updating subscription:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}