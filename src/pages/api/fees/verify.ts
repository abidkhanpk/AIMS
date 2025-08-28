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

  // Only admins can verify fee payments
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can verify fee payments' });
  }

  const { feeId, status, remarks } = req.body;

  if (!feeId || !status) {
    return res.status(400).json({ message: 'Fee ID and status are required' });
  }

  if (!['PAID', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either PAID or CANCELLED' });
  }

  try {
    // Verify the fee exists and belongs to this admin's student
    const fee = await prisma.fee.findFirst({
      where: {
        id: feeId,
        student: {
          adminId: session.user.id
        }
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

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found or access denied' });
    }

    // Update fee status
    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        status,
        processedDate: new Date(),
        ...(remarks && { paymentDetails: remarks }),
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

    // Get all associated parents for notifications
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: fee.studentId },
      include: { 
        parent: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Create notifications for all associated parents
    const notificationType = status === 'PAID' ? 'FEE_PAID' : 'PAYMENT_PROCESSING';
    const notificationTitle = status === 'PAID' ? 'Fee Payment Verified' : 'Fee Payment Cancelled';
    const notificationMessage = status === 'PAID' 
      ? `Payment for "${fee.title}" (${fee.currency} ${fee.amount}) for ${fee.student.name} has been verified and marked as paid.`
      : `Payment for "${fee.title}" (${fee.currency} ${fee.amount}) for ${fee.student.name} has been cancelled. ${remarks ? 'Reason: ' + remarks : ''}`;

    for (const parentStudent of parentStudents) {
      await prisma.notification.create({
        data: {
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          senderId: session.user.id,
          receiverId: parentStudent.parent.id,
        }
      });
    }

    // Also notify the person who made the payment (if different from parents)
    if (fee.paidById && !parentStudents.some(ps => ps.parent.id === fee.paidById)) {
      await prisma.notification.create({
        data: {
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          senderId: session.user.id,
          receiverId: fee.paidById,
        }
      });
    }

    res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error verifying fee payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}