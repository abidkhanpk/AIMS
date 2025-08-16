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

  // Only parents can pay fees
  if (session.user.role !== 'PARENT') {
    return res.status(403).json({ message: 'Only parents can pay fees' });
  }

  const { feeId } = req.body;

  if (!feeId) {
    return res.status(400).json({ message: 'Fee ID is required' });
  }

  try {
    // Verify the fee exists and belongs to one of the parent's children
    const fee = await prisma.fee.findFirst({
      where: {
        id: feeId,
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
            email: true,
            adminId: true,
          }
        }
      }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found or you are not authorized to pay this fee' });
    }

    if (fee.status === 'PAID') {
      return res.status(400).json({ message: 'Fee has already been paid' });
    }

    if (fee.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Fee has been cancelled' });
    }

    // Update fee status to paid
    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        paidById: session.user.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Create notification for admin
    if (fee.student.adminId) {
      await prisma.notification.create({
        data: {
          type: 'FEE_PAID',
          title: 'Fee Payment Received',
          message: `${session.user.name} has paid the fee "${fee.title}" ($${fee.amount}) for ${fee.student.name}`,
          senderId: session.user.id,
          receiverId: fee.student.adminId,
        }
      });
    }

    res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error processing fee payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}