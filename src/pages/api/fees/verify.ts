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

  const { feeId, action, remarks } = req.body;

  if (!feeId || !action) {
    return res.status(400).json({ message: 'Fee ID and action are required' });
  }

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Action must be either approve or reject' });
  }

  try {
    // Verify fee exists and belongs to this admin's student
    const fee = await prisma.fee.findFirst({
      where: {
        id: feeId,
        student: {
          adminId: session.user.id
        },
        status: 'PROCESSING'
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
      return res.status(404).json({ message: 'Fee not found or not eligible for verification' });
    }

    let updateData: any = {
      processedDate: new Date(),
    };

    if (action === 'approve') {
      updateData.status = 'PAID';
    } else {
      updateData.status = 'PENDING';
      updateData.paidAmount = null;
      updateData.paymentDetails = null;
      updateData.paymentProof = null;
      updateData.paidById = null;
      updateData.paidDate = null;
    }

    if (remarks) {
      updateData.paymentDetails = updateData.paymentDetails 
        ? `${updateData.paymentDetails}\n\nAdmin remarks: ${remarks}`
        : `Admin remarks: ${remarks}`;
    }

    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: updateData,
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

    // Create notifications
    const notificationType = action === 'approve' ? 'PAYMENT_VERIFIED' : 'PAYMENT_PROCESSING';
    const notificationTitle = action === 'approve' ? 'Fee Payment Approved' : 'Fee Payment Rejected';
    const notificationMessage = action === 'approve' 
      ? `Your payment for fee "${fee.title}" has been approved and confirmed.`
      : `Your payment for fee "${fee.title}" has been rejected. ${remarks ? `Reason: ${remarks}` : 'Please contact admin for details.'}`;

    // Notify the person who paid
    if (fee.paidBy) {
      await prisma.notification.create({
        data: {
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          senderId: session.user.id,
          receiverId: fee.paidBy.id,
        }
      });
    }

    // Notify all linked parents
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: fee.studentId },
      include: { parent: true }
    });

    for (const parentStudent of parentStudents) {
      // Don't notify the parent who made the payment (already notified above)
      if (!fee.paidBy || parentStudent.parent.id !== fee.paidBy.id) {
        await prisma.notification.create({
          data: {
            type: notificationType,
            title: notificationTitle,
            message: `Fee payment for "${fee.title}" for ${fee.student.name} has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
            senderId: session.user.id,
            receiverId: parentStudent.parent.id,
          }
        });
      }
    }

    // If approved, create fee paid notification
    if (action === 'approve') {
      for (const parentStudent of parentStudents) {
        await prisma.notification.create({
          data: {
            type: 'FEE_PAID',
            title: 'Fee Payment Confirmed',
            message: `Fee "${fee.title}" of ${fee.currency} ${fee.amount} has been paid for ${fee.student.name}.`,
            senderId: session.user.id,
            receiverId: parentStudent.parent.id,
          }
        });
      }
    }

    res.status(200).json({
      message: `Fee payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      fee: updatedFee
    });
  } catch (error) {
    console.error('Error verifying fee payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}