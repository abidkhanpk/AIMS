import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const { remarkId, content } = req.body as { remarkId?: string; content?: string };
  if (!remarkId || !content?.trim()) return res.status(400).json({ message: 'Remark ID and content required' });

  try {
    const remark = await prisma.parentRemark.findUnique({
      where: { id: remarkId },
      include: { progress: { include: { student: true, teacher: true, course: true } } },
    });
    if (!remark) return res.status(404).json({ message: 'Remark not found' });

    const userId = session.user.id;
    const role = session.user.role;
    let allowed = false;
    if (role === 'ADMIN' && remark.progress.student.adminId === userId) allowed = true;
    if (role === 'TEACHER' && remark.progress.teacherId === userId) allowed = true;
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    const reply = await prisma.parentRemarkReply.create({
      data: { remarkId, authorId: userId, content: content.trim() },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Notify parent and teacher when admin replies; notify parent/admin when teacher replies
    const receivers = new Set<string>();
    receivers.add(remark.parentId);
    receivers.add(remark.progress.teacherId);
    if (remark.progress.student.adminId) receivers.add(remark.progress.student.adminId);
    receivers.delete(userId);

    const notifications = Array.from(receivers).map((receiverId) =>
      prisma.notification.create({
        data: {
          type: 'PROGRESS_UPDATE',
          title: 'Remark reply',
          message: `${reply.author.name} replied on remark for ${remark.progress.student.name} (${remark.progress.course.name})`,
          senderId: userId,
          receiverId,
        },
      })
    );
    if (notifications.length > 0) {
      await Promise.all(notifications);
    }

    return res.status(201).json(reply);
  } catch (error) {
    console.error('Error replying to remark:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
