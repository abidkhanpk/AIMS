import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { role } = req.query;
  const userRole = session.user.role;

  try {
    let users;

    if (userRole === 'DEVELOPER') {
      // Developers can see all admins with full settings and subscription data
      if (role === 'ADMIN') {
        users = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            mobile: true,
            address: true,
            createdAt: true,
            settings: {
              select: {
                appTitle: true,
                headerImg: true,
                tagline: true,
                enableHomePage: true,
                defaultCurrency: true,
                subscriptionType: true,
                subscriptionAmount: true,
                subscriptionStartDate: true,
                subscriptionEndDate: true,
              }
            },
            subscriptions: {
              select: {
                id: true,
                plan: true,
                amount: true,
                currency: true,
                startDate: true,
                endDate: true,
                status: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5 // Get latest 5 subscriptions
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        users = await prisma.user.findMany({
          where: role ? { role: role as Role } : {},
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else if (userRole === 'ADMIN') {
      // Admins can see their managed users
      users = await prisma.user.findMany({
        where: {
          adminId: session.user.id,
          ...(role && { role: role as Role })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mobile: true,
          dateOfBirth: true,
          address: true,
          qualification: true,
          payRate: true,
          payType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}