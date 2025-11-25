import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { randomUUID } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { receiverId, content, subject, threadId } = req.body as { receiverId?: string; content?: string; subject?: string; threadId?: string };
  if (!receiverId || !content?.trim()) {
    return res.status(400).json({ message: 'Receiver and content are required' });
  }

  if (receiverId === session.user.id) {
    return res.status(400).json({ message: 'Cannot message yourself' });
  }

  try {
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, adminId: true, isActive: true },
    });

    if (!receiver || receiver.isActive === false) {
      return res.status(404).json({ message: 'Recipient not found or inactive' });
    }

    // Optional: check same admin unless sender is DEVELOPER
    if (
      session.user.role !== 'DEVELOPER' &&
      session.user.adminId &&
      receiver.adminId &&
      session.user.adminId !== receiver.adminId
    ) {
      return res.status(403).json({ message: 'Cross-admin messaging is not allowed' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        subject: subject?.trim() || 'No subject',
        threadId: threadId || randomUUID(),
        content: content.trim(),
      },
    });

    await prisma.notification.create({
      data: {
        type: 'SYSTEM_ALERT',
        title: subject?.trim() || 'New message',
        message: `You received a new message from ${session.user.name || session.user.id}`,
        senderId: session.user.id,
        receiverId,
      },
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
