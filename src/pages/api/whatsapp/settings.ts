import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

const WA_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';
const WA_SECRET = process.env.WHATSAPP_API_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userRole = session.user.role;
  if (!['DEVELOPER', 'ADMIN'].includes(userRole)) {
    return res.status(403).json({ message: 'Only developers and admins can manage WhatsApp settings' });
  }

  const clientId = session.user.id;

  // GET — Get current settings
  if (req.method === 'GET') {
    try {
      const waSession = await prisma.whatsAppSession.findUnique({
        where: { userId: clientId },
      });

      if (!waSession) {
        return res.json({
          minDelayMs: 5000,
          maxDelayMs: 15000,
          maxBatchSize: 50,
        });
      }

      return res.json({
        minDelayMs: waSession.minDelayMs,
        maxDelayMs: waSession.maxDelayMs,
        maxBatchSize: waSession.maxBatchSize,
      });
    } catch (error) {
      console.error('WhatsApp settings fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch WhatsApp settings' });
    }
  }

  // PUT — Update settings
  if (req.method === 'PUT') {
    const { minDelayMs, maxDelayMs, maxBatchSize } = req.body;

    try {
      // Update in DB
      const waSession = await prisma.whatsAppSession.upsert({
        where: { userId: clientId },
        create: {
          userId: clientId,
          minDelayMs: Math.max(1000, minDelayMs || 5000),
          maxDelayMs: Math.max(1000, maxDelayMs || 15000),
          maxBatchSize: Math.max(1, maxBatchSize || 50),
        },
        update: {
          ...(minDelayMs !== undefined && { minDelayMs: Math.max(1000, minDelayMs) }),
          ...(maxDelayMs !== undefined && { maxDelayMs: Math.max(1000, maxDelayMs) }),
          ...(maxBatchSize !== undefined && { maxBatchSize: Math.max(1, maxBatchSize) }),
        },
      });

      // Also update on the WhatsApp server
      try {
        await fetch(`${WA_SERVER_URL}/api/message/settings/${clientId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WA-SECRET': WA_SECRET,
          },
          body: JSON.stringify({
            minDelayMs: waSession.minDelayMs,
            maxDelayMs: waSession.maxDelayMs,
            maxDailyMessages: waSession.maxBatchSize,
          }),
        });
      } catch (e) {
        // Non-critical — server may not be running
        console.warn('Could not sync settings to WhatsApp server:', (e as Error).message);
      }

      return res.json({
        minDelayMs: waSession.minDelayMs,
        maxDelayMs: waSession.maxDelayMs,
        maxBatchSize: waSession.maxBatchSize,
      });
    } catch (error) {
      console.error('WhatsApp settings update error:', error);
      return res.status(500).json({ message: 'Failed to update WhatsApp settings' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
