import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { encrypt } from '../../../lib/crypto';

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
          smtpFrom: true,
          defaultCurrency: true,
          slug: true,
        }
      });
      
      if (settings) {
        const responseData = { ...settings };
        if (responseData.smtpPass) {
          responseData.smtpPass = '********';
        }
        return res.status(200).json(responseData);
      }

      return res.status(200).json({});
    } catch (error) {
      console.error('Error fetching academy settings:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      let { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpReplyTo, smtpFrom, defaultCurrency, slug } = req.body;
      
      if (slug !== undefined) {
        if (slug === '' || slug === null) {
          slug = null;
        } else {
          slug = slug.trim().toLowerCase();
          const RESERVED_WORDS = new Set([
            'auth', 'dashboard', 'register', 'messages', 'privacy-policy', 'developer',
            '404', 'api', '_next', 'assets', 'icons', 'public', 'sw.js', 'favicon.ico',
            'manifest.json', 'robots.txt'
          ]);
          if (RESERVED_WORDS.has(slug) || !/^[a-z0-9-]+$/.test(slug)) {
            return res.status(400).json({ message: 'Invalid custom link. Use only lowercase letters, numbers, and hyphens. Reserved words are not allowed.' });
          }

          // Check if slug is already taken
          const existingSettings = await prisma.settings.findFirst({
            where: {
              slug,
              NOT: { adminId }
            }
          });

          if (existingSettings) {
            return res.status(400).json({ message: 'This custom link is already in use by another academy.' });
          }
        }
      }

      let finalSmtpPass: string | null | undefined = undefined;
      if (smtpPass !== undefined) {
        if (smtpPass === '********') {
          finalSmtpPass = undefined; // unchanged
        } else if (smtpPass === '' || smtpPass === null) {
          finalSmtpPass = null;
        } else {
          finalSmtpPass = encrypt(smtpPass);
        }
      }
      
      const updatedSettings = await prisma.settings.upsert({
        where: { adminId },
        update: {
          smtpHost,
          smtpPort,
          smtpUser,
          ...(finalSmtpPass !== undefined && { smtpPass: finalSmtpPass }),
          smtpSecure,
          smtpReplyTo,
          smtpFrom,
          defaultCurrency: defaultCurrency || 'PKR',
          ...(slug !== undefined && { slug }),
        },
        create: {
          adminId,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass: finalSmtpPass !== undefined ? finalSmtpPass : null,
          smtpSecure,
          smtpReplyTo,
          smtpFrom,
          defaultCurrency: defaultCurrency || 'PKR',
          slug: slug || null,
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
