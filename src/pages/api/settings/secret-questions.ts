import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { secretQuestion1, secretAnswer1, secretQuestion2, secretAnswer2, timezone } = req.body;

  if (!secretQuestion1 || !secretAnswer1 || !secretQuestion2 || !secretAnswer2) {
    return res.status(400).json({ message: 'Both security questions and answers are required' });
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        secretQuestion1,
        secretAnswer1,
        secretQuestion2,
        secretAnswer2,
        timezone: timezone || 'UTC'
      },
      create: {
        userId: session.user.id,
        secretQuestion1,
        secretAnswer1,
        secretQuestion2,
        secretAnswer2,
        timezone: timezone || 'UTC'
      }
    });

    res.status(200).json({ message: 'Security questions updated successfully' });
  } catch (error) {
    console.error('Secret questions update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
