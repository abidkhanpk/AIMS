import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only Admins and Developers can access audit logs
  if (session.user.role !== 'ADMIN' && session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100, // Fetch the latest 100 logs
        include: {
          user: {
            select: { id: true, name: true, role: true }
          }
        }
      });
      return res.status(200).json(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { actionType, resourceId, details } = req.body;
      const log = await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          actionType,
          resourceId,
          details
        }
      });
      return res.status(201).json(log);
    } catch (error) {
      console.error('Error creating audit log:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
