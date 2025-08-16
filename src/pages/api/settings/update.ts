import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Only developers can update settings' });
  }

  const { adminId, appTitle, headerImg } = req.body;

  if (!adminId) {
    return res.status(400).json({ message: 'Admin ID is required' });
  }

  try {
    // Verify admin exists
    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: 'ADMIN'
      }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { adminId },
      update: {
        ...(appTitle && { appTitle }),
        ...(headerImg && { headerImg }),
      },
      create: {
        adminId,
        appTitle: appTitle || 'LMS Academy',
        headerImg: headerImg || '/assets/logo.png',
      },
      select: {
        id: true,
        appTitle: true,
        headerImg: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}