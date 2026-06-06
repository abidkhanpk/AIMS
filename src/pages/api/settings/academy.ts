import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ message: 'Unauthorized. Only Admins can modify academy settings.' });
  }

  const adminId = session.user.id;

  if (req.method === 'GET') {
    try {
      const settings = await prisma.settings.findUnique({
        where: { adminId },
        select: {
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          smtpPass: true,
          smtpSecure: true,
          smtpReplyTo: true,
          smtpFrom: true
        }
      });
      return res.status(200).json(settings || {});
    } catch (error) {
      console.error('Error fetching academy settings:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpReplyTo, smtpFrom } = req.body;
      
      const updatedSettings = await prisma.settings.upsert({
        where: { adminId },
        update: {
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpReplyTo,
          smtpFrom
        },
        create: {
          adminId,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpReplyTo,
          smtpFrom
        }
      });
      
      // Log this in the audit log
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          actionType: 'ACADEMY_SETTINGS_UPDATED',
          resourceId: updatedSettings.id,
          details: 'Admin updated Academy SMTP Configuration.'
        }
      });

      return res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating academy settings:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
