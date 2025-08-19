import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: session.user.id }
      });

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true }
      });

      res.status(200).json({
        email: user?.email,
        secretQuestion1: userSettings?.secretQuestion1 || '',
        secretAnswer1: userSettings?.secretAnswer1 || '',
        secretQuestion2: userSettings?.secretQuestion2 || '',
        secretAnswer2: userSettings?.secretAnswer2 || '',
        timezone: userSettings?.timezone || 'UTC',
        enableNotifications: userSettings?.enableNotifications ?? true,
        emailNotifications: userSettings?.emailNotifications ?? true,
        parentRemarkNotifications: userSettings?.parentRemarkNotifications ?? true
      });
    } catch (error) {
      console.error('Get user settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { 
        timezone, 
        enableNotifications, 
        emailNotifications, 
        parentRemarkNotifications 
      } = req.body;

      // Upsert user settings
      await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: {
          timezone: timezone || 'UTC',
          enableNotifications: enableNotifications ?? true,
          emailNotifications: emailNotifications ?? true,
          parentRemarkNotifications: parentRemarkNotifications ?? true
        },
        create: {
          userId: session.user.id,
          timezone: timezone || 'UTC',
          enableNotifications: enableNotifications ?? true,
          emailNotifications: emailNotifications ?? true,
          parentRemarkNotifications: parentRemarkNotifications ?? true
        }
      });

      res.status(200).json({ message: 'User settings updated successfully' });
    } catch (error) {
      console.error('Update user settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}