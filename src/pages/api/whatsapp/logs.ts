import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userRole = session.user.role;
  if (!['DEVELOPER', 'ADMIN'].includes(userRole)) {
    return res.status(403).json({ message: 'Only developers and admins can view WhatsApp logs' });
  }

  const clientId = session.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const skip = (page - 1) * limit;
  const messageType = req.query.messageType as string | undefined;
  const status = req.query.status as string | undefined;

  try {
    const waSession = await prisma.whatsAppSession.findUnique({
      where: { userId: clientId },
    });

    if (!waSession) {
      return res.json({ logs: [], total: 0, page, limit });
    }

    const where: any = { sessionId: waSession.id };
    if (messageType) where.messageType = messageType;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.whatsAppMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.whatsAppMessageLog.count({ where }),
    ]);

    return res.json({ logs, total, page, limit });
  } catch (error) {
    console.error('WhatsApp logs fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch WhatsApp message logs' });
  }
}
