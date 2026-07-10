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
    return res.status(403).json({ message: 'Only developers and admins can access QR codes' });
  }

  const clientId = session.user.id;

  try {
    const waRes = await fetch(`${WA_SERVER_URL}/api/session/qr/${clientId}`, {
      headers: { 'X-WA-SECRET': WA_SECRET },
    });

    const data = await waRes.json();

    // If connected, update DB
    if (data.connected && data.phoneNumber) {
      await prisma.whatsAppSession.upsert({
        where: { userId: clientId },
        create: {
          userId: clientId,
          isConnected: true,
          phoneNumber: data.phoneNumber,
          lastConnected: new Date(),
        },
        update: {
          isConnected: true,
          phoneNumber: data.phoneNumber,
          lastConnected: new Date(),
        },
      });
    }

    return res.json(data);
  } catch (error) {
    console.error('WhatsApp QR fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch QR code' });
  }
}
