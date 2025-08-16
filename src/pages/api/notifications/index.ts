import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const notifications = await prisma.notification.findMany({
        where: { receiverId: session.user.id },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to last 50 notifications
      });

      const unreadCount = await prisma.notification.count({
        where: {
          receiverId: session.user.id,
          isRead: false
        }
      });

      res.status(200).json({
        notifications,
        unreadCount
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Mark notification as read
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }

    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          receiverId: session.user.id
        },
        data: {
          isRead: true
        }
      });

      if (notification.count === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}