import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { feeId, amount, paidDate, paymentDetails, paymentProof } = req.body;

  try {
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { feeDefinition: true },
    });

    if (!fee || (fee.studentId !== user.id && user.role !== 'PARENT')) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        paidAmount: parseFloat(amount),
        paidDate: new Date(paidDate),
        paymentDetails,
        paymentProof,
        status: 'PROCESSING',
        paidById: user.id,
      },
    });

    // Notify admin
    const admin = await prisma.user.findUnique({
        where: { id: fee.feeDefinition.adminId },
    });

    if (admin) {
        await prisma.notification.create({
            data: {
                type: 'PAYMENT_PROCESSING',
                title: 'Fee Payment Submitted',
                message: `A fee payment for ${fee.feeDefinition.title} has been submitted by ${user.name}.`,
                senderId: user.id,
                receiverId: admin.id,
            },
        });
    }

    return res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error processing fee payment:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
