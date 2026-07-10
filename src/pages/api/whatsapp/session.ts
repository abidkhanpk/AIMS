import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

const WA_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';
const WA_SECRET = process.env.WHATSAPP_API_SECRET || '';

async function waFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${WA_SERVER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-WA-SECRET': WA_SECRET,
      ...options.headers,
    },
  });
  return res;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userRole = session.user.role;
  if (!['DEVELOPER', 'ADMIN'].includes(userRole)) {
    return res.status(403).json({ message: 'Only developers and admins can manage WhatsApp sessions' });
  }

  const clientId = session.user.id;

  // GET — Check session status
  if (req.method === 'GET') {
    try {
      const waRes = await waFetch(`/api/session/status/${clientId}`);
      const data = await waRes.json();

      // Also get DB record
      const dbSession = await prisma.whatsAppSession.findUnique({
        where: { userId: clientId },
      });

      return res.json({
        ...data,
        dbSession: dbSession ? {
          id: dbSession.id,
          phoneNumber: dbSession.phoneNumber,
          isConnected: dbSession.isConnected,
          lastConnected: dbSession.lastConnected,
          minDelayMs: dbSession.minDelayMs,
          maxDelayMs: dbSession.maxDelayMs,
          maxBatchSize: dbSession.maxBatchSize,
        } : null,
      });
    } catch (error) {
      console.error('WhatsApp session status error:', error);
      return res.status(500).json({ message: 'Failed to check WhatsApp session status' });
    }
  }

  // POST — Initialize session
  if (req.method === 'POST') {
    try {
      const waRes = await waFetch(`/api/session/init/${clientId}`, {
        method: 'POST',
      });
      const data = await waRes.json();

      // Create or update DB record
      await prisma.whatsAppSession.upsert({
        where: { userId: clientId },
        create: {
          userId: clientId,
          isConnected: false,
        },
        update: {
          // Just mark as in-progress, actual connection update comes via QR flow
        },
      });

      return res.json(data);
    } catch (error) {
      console.error('WhatsApp session init error:', error);
      return res.status(500).json({ message: 'Failed to initialize WhatsApp session' });
    }
  }

  // DELETE — Disconnect session
  if (req.method === 'DELETE') {
    try {
      const removeAuth = req.query.removeAuth !== 'false'; // default: true
      const waRes = await waFetch(`/api/session/${clientId}?removeAuth=${removeAuth}`, {
        method: 'DELETE',
      });
      const data = await waRes.json();

      // Update DB record
      if (removeAuth) {
        await prisma.whatsAppSession.updateMany({
          where: { userId: clientId },
          data: {
            isConnected: false,
            phoneNumber: null,
            lastConnected: null,
          },
        });
      } else {
        await prisma.whatsAppSession.updateMany({
          where: { userId: clientId },
          data: {
            isConnected: false,
          },
        });
      }

      return res.json(data);
    } catch (error) {
      console.error('WhatsApp session disconnect error:', error);
      return res.status(500).json({ message: 'Failed to disconnect WhatsApp session' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
