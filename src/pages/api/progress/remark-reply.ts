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

  const { remarkId, content } = req.body as { remarkId?: string; content?: string };
  if (!remarkId || !content?.trim()) {
    return res.status(400).json({ message: 'Remark ID and content are required' });
  }

  try {
    const remark = await prisma.parentRemark.findUnique({
      where: { id: remarkId },
      include: {
        progress: {
          include: {
            student: true,
            teacher: true,
            course: true,
          },
        },
      },
    });

    if (!remark) {
      return res.status(404).json({ message: 'Parent remark not found' });
    }

    // Permissions: teacher of the progress OR admin of the student
    const userRole = session.user.role;
    const userId = session.user.id;
    const adminId = session.user.adminId;

    let allowed = false;
    if (userRole === 'TEACHER' && remark.progress.teacherId === userId) {
      allowed = true;
    }
    if (userRole === 'ADMIN' && remark.progress.student.adminId === userId) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reply = await prisma.parentRemarkReply.create({
      data: {
        remarkId,
        authorId: userId,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // notify remark parent + teacher/admin
    const receivers = new Set<string>();
    receivers.add(remark.parentId);
    receivers.add(remark.progress.teacherId);
    if (remark.progress.student.adminId) receivers.add(remark.progress.student.adminId);
    receivers.delete(userId);

    receivers.forEach(async (receiverId) => {
      await prisma.notification.create({
        data: {
          type: 'PROGRESS_UPDATE',
          title: 'Remark reply',
          message: `${reply.author.name} replied on remark for ${remark.progress.student.name} (${remark.progress.course.name})`,
          senderId: userId,
          receiverId,
        },
      });
    });

    return res.status(201).json(reply);
  } catch (error) {
    console.error('Error creating remark reply:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
