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

    if (session.user.role === 'ADMIN') {
      // Admin gets their own settings
      settings = await prisma.settings.findUnique({
        where: { adminId: session.user.id },
        select: {
          id: true,
          appTitle: true,
          headerImg: true,
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
        }
      });
    } else {
      // Developer or users without admin - return default settings
      settings = {
        appTitle: 'LMS Academy',
        headerImg: '/assets/logo.png',
      };
    }

    if (!settings) {
      // Return default settings if none found
      settings = {
        appTitle: 'LMS Academy',
        headerImg: '/assets/logo.png',
      };
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}