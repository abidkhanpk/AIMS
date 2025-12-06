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

  const { threadId } = req.body as { threadId?: string };
  if (!threadId) {
    return res.status(400).json({ message: 'threadId is required' });
  }

  try {
    await prisma.message.updateMany({
      where: {
        threadId,
        receiverId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking messages read:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
