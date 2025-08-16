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
      // Developers can see all admins
      if (role === 'ADMIN') {
        users = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            settings: {
              select: {
                appTitle: true,
                headerImg: true,
              }
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