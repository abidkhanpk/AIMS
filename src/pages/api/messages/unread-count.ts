import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const count = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        isRead: false,
      },
    });
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error counting unread messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
