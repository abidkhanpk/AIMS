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

  try {
    let settings;

    if (session.user.role === 'DEVELOPER') {
      // Developer gets global app settings
      let appSettings = await prisma.appSettings.findFirst();
      
      if (!appSettings) {
        // Create default app settings if none exist
        appSettings = await prisma.appSettings.create({
          data: {
            appLogo: '/assets/app-logo.png',
            appName: 'LMS Academy',
            enableHomePage: true,
          }
        });
      }

      settings = {
        appTitle: appSettings.appName,
        headerImg: appSettings.appLogo,
        enableHomePage: appSettings.enableHomePage,
      };
    } else if (session.user.role === 'ADMIN') {
      // Admin gets their own settings
      settings = await prisma.settings.findUnique({
        where: { adminId: session.user.id },
        select: {
          id: true,
          appTitle: true,
          headerImg: true,
          enableHomePage: true,
        }
      });
    } else if (session.user.adminId) {
      // Other users get their admin's settings
      settings = await prisma.settings.findUnique({
        where: { adminId: session.user.adminId },
        select: {
          id: true,
          appTitle: true,
          headerImg: true,
          enableHomePage: true,
        }
      });
    } else {
      // Users without admin - return default settings
      settings = {
        appTitle: 'LMS Academy',
        headerImg: '/assets/logo.png',
        enableHomePage: true,
      };
    }

    if (!settings) {
      // Return default settings if none found
      settings = {
        appTitle: 'LMS Academy',
        headerImg: '/assets/logo.png',
        enableHomePage: true,
      };
    }

    // For non-developers, check global homepage setting
    if (session.user.role !== 'DEVELOPER') {
      const appSettings = await prisma.appSettings.findFirst();
      if (appSettings && !appSettings.enableHomePage) {
        settings.enableHomePage = false;
      }
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}