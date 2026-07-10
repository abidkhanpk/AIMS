import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

const WA_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';
const WA_SECRET = process.env.WHATSAPP_API_SECRET || '';

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

    // Sync any pending messages with the WhatsApp server queue state
    const pendingLogs = await prisma.whatsAppMessageLog.findMany({
      where: {
        sessionId: waSession.id,
        status: { in: ['QUEUED', 'SENDING'] },
      },
    });

    if (pendingLogs.length > 0) {
      try {
        const queueRes = await fetch(`${WA_SERVER_URL}/api/message/queue/${clientId}`, {
          headers: {
            'X-WA-SECRET': WA_SECRET,
          },
        });
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          const waMessages = queueData.messages || [];

          for (const log of pendingLogs) {
            const cleanLogPhone = log.recipientPhone.replace(/[^\d]/g, '');
            const matchingMsg = waMessages.find((m: any) => {
              const cleanMsgPhone = m.to.replace(/[^\d]/g, '');
              return cleanMsgPhone.endsWith(cleanLogPhone.slice(-9)) && m.text === log.messageText;
            });

            if (matchingMsg) {
              const mappedStatus = 
                matchingMsg.status === 'sent' ? 'SENT' :
                matchingMsg.status === 'failed' ? 'FAILED' :
                matchingMsg.status === 'sending' ? 'SENDING' : 'QUEUED';

              await prisma.whatsAppMessageLog.update({
                where: { id: log.id },
                data: {
                  status: mappedStatus,
                  errorMessage: matchingMsg.error || null,
                },
              });
            } else {
              // If not found in the queue, and is older than 2 minutes, assume completed
              const minutesElapsed = (Date.now() - new Date(log.createdAt).getTime()) / 60000;
              if (minutesElapsed > 2) {
                await prisma.whatsAppMessageLog.update({
                  where: { id: log.id },
                  data: {
                    status: 'SENT',
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to sync WhatsApp queue status:', (err as Error).message);
      }
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
