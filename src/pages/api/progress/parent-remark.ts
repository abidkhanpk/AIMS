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

  if (session.user.role !== 'PARENT') {
    return res.status(403).json({ message: 'Only parents can add remarks' });
  }

  const { progressId, remark } = req.body;

  if (!progressId || !remark) {
    return res.status(400).json({ message: 'Progress ID and remark are required' });
  }

  try {
    // Verify the progress record exists and belongs to parent's child
    const progress = await prisma.progress.findFirst({
      where: {
        id: progressId,
        student: {
          studentParents: {
            some: {
              parentId: session.user.id
            }
          }
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            adminId: true,
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
          }
        },
        course: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found or access denied' });
    }

    // Create parent remark
    const parentRemark = await prisma.parentRemark.create({
      data: {
        progressId,
        parentId: session.user.id,
        remark,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Create notifications for teacher and admin
    const notificationRecipients = [progress.teacher.id];
    if (progress.student.adminId) {
      notificationRecipients.push(progress.student.adminId);
    }

    for (const recipientId of notificationRecipients) {
      await prisma.notification.create({
        data: {
          type: 'PARENT_REMARK',
          title: 'New Parent Remark',
          message: `${parentRemark.parent.name} added a remark for ${progress.student.name} in ${progress.course.name}`,
          senderId: session.user.id,
          receiverId: recipientId,
        }
      });
    }

    res.status(201).json(parentRemark);
  } catch (error) {
    console.error('Error adding parent remark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}