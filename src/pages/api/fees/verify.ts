import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Only ADMIN or DEVELOPER can verify/reject
  if (session.user.role !== 'ADMIN' && session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { feeId, approve } = req.body as { feeId?: string; approve?: boolean };

  if (!feeId || typeof feeId !== 'string') {
    return res.status(400).json({ message: 'Invalid fee id' });
  }

  try {
    // Scope fee to the admin when role is ADMIN; developers can access any fee
    const fee = await prisma.fee.findFirst({
      where: {
        id: feeId,
        ...(session.user.role === 'ADMIN' ? { student: { adminId: session.user.id } } : {}),
      },
      include: { feeDefinition: true, student: true },
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (fee.status !== 'PROCESSING') {
      return res.status(400).json({ message: 'Only payments in processing can be verified or rejected' });
    }

    let updated;

    if (approve) {
      updated = await prisma.fee.update({
        where: { id: feeId },
        data: {
          status: 'PAID',
          processedDate: new Date(),
        },
      });

      // Notify payer if available
      if (fee.paidById) {
        await prisma.notification.create({
          data: {
            type: 'PAYMENT_VERIFIED',
            title: 'Fee Payment Verified',
            message: `Your fee payment for ${fee.title} has been verified.`,
            senderId: session.user.id,
            receiverId: fee.paidById,
          },
        });
      }
    } else {
      // Rejection: revert status to PENDING and clear payment fields
      updated = await prisma.fee.update({
        where: { id: feeId },
        data: {
          status: 'PENDING',
          processedDate: new Date(),
          paidAmount: null,
          paidDate: null,
          paymentDetails: null,
          paymentProof: null,
          paidById: null,
        },
      });

      if (fee.paidById) {
        await prisma.notification.create({
          data: {
            type: 'SYSTEM_ALERT',
            title: 'Fee Payment Rejected',
            message: `Your fee payment for ${fee.title} was rejected. Please review details and resubmit.`,
            senderId: session.user.id,
            receiverId: fee.paidById,
          },
        });
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error verifying/rejecting fee payment:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
