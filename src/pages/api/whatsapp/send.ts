import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

const WA_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';
const WA_SECRET = process.env.WHATSAPP_API_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userRole = session.user.role;
  if (!['DEVELOPER', 'ADMIN'].includes(userRole)) {
    return res.status(403).json({ message: 'Only developers and admins can send WhatsApp messages' });
  }

  const clientId = session.user.id;
  const { to, text, messages, messageType, recipientName } = req.body;

  // Check that user has an active WhatsApp session
  const waSession = await prisma.whatsAppSession.findUnique({
    where: { userId: clientId },
  });

  if (!waSession) {
    return res.status(400).json({ message: 'No WhatsApp session found. Please connect WhatsApp first.' });
  }

  try {
    let waRes;
    let logEntries: Array<{ to: string; text: string; recipientName?: string; messageType: string }> = [];

    if (messages && Array.isArray(messages)) {
      // Bulk send
      waRes = await fetch(`${WA_SERVER_URL}/api/message/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WA-SECRET': WA_SECRET,
        },
        body: JSON.stringify({ clientId, messages }),
      });

      logEntries = messages.map((m: any) => ({
        to: m.to,
        text: m.text,
        recipientName: m.recipientName || recipientName,
        messageType: m.messageType || messageType || 'CUSTOM',
      }));
    } else if (to && text) {
      // Single send
      waRes = await fetch(`${WA_SERVER_URL}/api/message/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WA-SECRET': WA_SECRET,
        },
        body: JSON.stringify({ clientId, to, text }),
      });

      logEntries = [{ to, text, recipientName, messageType: messageType || 'CUSTOM' }];
    } else {
      return res.status(400).json({ message: 'Either (to + text) or messages array is required' });
    }

    const data = await waRes.json();

    // Log messages in DB
    if (logEntries.length > 0) {
      await prisma.whatsAppMessageLog.createMany({
        data: logEntries.map(entry => ({
          sessionId: waSession.id,
          recipientPhone: entry.to,
          recipientName: entry.recipientName || null,
          messageType: entry.messageType,
          messageText: entry.text,
          status: 'QUEUED',
        })),
      });
    }

    return res.json(data);
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return res.status(500).json({ message: 'Failed to send WhatsApp message' });
  }
}
