import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { encrypt } from '../../../lib/crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Public GET: anyone (even unauthenticated) can read app settings
  if (req.method === 'GET') {
    try {
      let appSettings = await prisma.appSettings.findFirst();

      if (!appSettings) {
        // Create default app settings if none exist
        appSettings = await prisma.appSettings.create({
          data: {
            appLogo: '/assets/app-logo.png',
            appName: 'AIMS',
            tagline: 'Academy Information and Management System',
            enableHomePage: true,
            defaultCurrency: 'USD',
          }
        });
      }

      // Mask password before sending to frontend
      if (appSettings.smtpPass) {
        appSettings.smtpPass = '********';
      }

      return res.status(200).json(appSettings);
    } catch (error) {
      console.error('Error fetching developer settings:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // All non-GET methods require an authenticated DEVELOPER
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Only developers can access this endpoint' });
  }

  if (req.method === 'POST') {
    const { enableHomePage, appName, appLogo, tagline, defaultCurrency, storageProvider, driveFolderId, cloudinaryFolder, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpReplyTo, smtpFrom } = req.body;
 
    let finalSmtpPass = undefined;
    if (smtpPass !== undefined) {
      if (smtpPass === '********') {
        // Password wasn't changed, ignore it
        finalSmtpPass = undefined;
      } else if (smtpPass === '' || smtpPass === null) {
        finalSmtpPass = null;
      } else {
        finalSmtpPass = encrypt(smtpPass);
      }
    }

    try {
      // Get existing settings or create new ones
      let appSettings = await prisma.appSettings.findFirst();
 
      if (appSettings) {
        // Update existing settings
        appSettings = await prisma.appSettings.update({
          where: { id: appSettings.id },
          data: {
            ...(enableHomePage !== undefined && { enableHomePage }),
            ...(appName && { appName }),
            ...(appLogo && { appLogo }),
            ...(tagline && { tagline }),
            ...(defaultCurrency && { defaultCurrency }),
            ...(storageProvider && { storageProvider }),
            ...(driveFolderId !== undefined && { driveFolderId }),
            ...(cloudinaryFolder !== undefined && { cloudinaryFolder }),
            ...(smtpHost !== undefined && { smtpHost }),
            ...(smtpPort !== undefined && { smtpPort }),
            ...(smtpUser !== undefined && { smtpUser }),
            ...(finalSmtpPass !== undefined && { smtpPass: finalSmtpPass }),
            ...(smtpSecure !== undefined && { smtpSecure }),
            ...(smtpReplyTo !== undefined && { smtpReplyTo }),
            ...(smtpFrom !== undefined && { smtpFrom }),
          }
        });
      } else {
        // Create new settings
        appSettings = await prisma.appSettings.create({
          data: {
            appLogo: appLogo || '/assets/app-logo.png',
            appName: appName || 'AIMS',
            tagline: tagline || 'Academy Information and Management System',
            enableHomePage: enableHomePage !== undefined ? enableHomePage : true,
            defaultCurrency: defaultCurrency || 'USD',
            storageProvider: storageProvider || 'DRIVE',
            driveFolderId: driveFolderId || null,
            cloudinaryFolder: cloudinaryFolder || null,
            smtpHost: smtpHost || null,
            smtpPort: smtpPort || null,
            smtpUser: smtpUser || null,
            smtpPass: finalSmtpPass !== undefined ? finalSmtpPass : null,
            smtpSecure: smtpSecure || null,
            smtpReplyTo: smtpReplyTo || null,
            smtpFrom: smtpFrom || null,
          }
        });
      }

      return res.status(200).json(appSettings);
    } catch (error) {
      console.error('Error updating developer settings:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
