import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { feeId } = req.body;

  try {
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { feeDefinition: true, student: true },
    });

    if (!fee || !fee.feeDefinition || fee.feeDefinition.adminId !== (user.role === 'ADMIN' ? user.id : user.adminId)) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        processedDate: new Date(),
      },
    });

    // Notify student/parent
    if (fee.paidById) {
        await prisma.notification.create({
            data: {
                type: 'PAYMENT_VERIFIED',
                title: 'Fee Payment Verified',
                message: `Your fee payment for ${fee.title} has been verified.`,
                senderId: user.id,
                receiverId: fee.paidById,
            },
        });
    }

    return res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error verifying fee payment:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
