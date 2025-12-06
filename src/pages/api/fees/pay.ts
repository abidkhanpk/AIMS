import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { feeId, amount, paidDate, paymentDetails, paymentProof } = req.body;

  // Validate paidDate if provided
  let parsedPaidDate: Date | null = null;
  if (paidDate) {
    const candidate = new Date(paidDate);
    if (isNaN(candidate.getTime())) {
      return res.status(400).json({ message: 'Invalid paidDate' });
    }
    parsedPaidDate = candidate;
  }

  try {
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { feeDefinition: true },
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    // Authorization: student can pay their own fee; parent must be linked to the student
    const isStudentPayingSelf = user.role === 'STUDENT' && fee.studentId === user.id;
    let isLinkedParent = false;

    if (user.role === 'PARENT') {
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: user.id, studentId: fee.studentId },
      });
      isLinkedParent = Boolean(link);
    }

    if (!(isStudentPayingSelf || isLinkedParent)) {
      return res.status(403).json({ message: 'Not authorized to pay this fee' });
    }

    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        paidAmount: amount ? parseFloat(amount) : null,
        paidDate: parsedPaidDate,
        paymentDetails,
        paymentProof,
        status: 'PROCESSING',
        paidById: user.id,
      },
    });

    if (fee.feeDefinition) {
      const admin = await prisma.user.findUnique({
        where: { id: fee.feeDefinition.adminId },
      });

      if (admin) {
        await prisma.notification.create({
          data: {
            type: 'PAYMENT_PROCESSING',
            title: 'Fee Payment Submitted',
            message: `A fee payment for ${fee.title} has been submitted by ${user.name}.`,
            senderId: user.id,
            receiverId: admin.id,
          },
        });
      }
    }

    return res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error processing fee payment:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
