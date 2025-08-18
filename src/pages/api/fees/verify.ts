import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can verify payments' });
  }

  const { feeId, approved } = req.body;

  if (!feeId || typeof approved !== 'boolean') {
    return res.status(400).json({ message: 'Fee ID and approval status are required' });
  }

  try {
    // Verify the fee exists and belongs to this admin's students
    const fee = await prisma.fee.findFirst({
      where: {
        id: feeId,
        student: {
          adminId: session.user.id
        }
      },
      include: {
        student: true,
        paidBy: true
      }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found or access denied' });
    }

    // Update fee status based on approval
    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: approved ? 'PAID' : 'PENDING',
        processedDate: new Date(),
        ...(approved && { paidDate: new Date() })
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

    // Create notification for the person who paid
    if (fee.paidById) {
      await prisma.notification.create({
        data: {
          type: approved ? 'PAYMENT_VERIFIED' : 'SYSTEM_ALERT',
          title: approved ? 'Payment Verified' : 'Payment Rejected',
          message: approved 
            ? `Your payment for "${fee.title}" has been verified and marked as paid`
            : `Your payment for "${fee.title}" has been rejected. Please contact admin for details`,
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