import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { feeId } = req.body as { feeId?: string };
  if (!feeId || typeof feeId !== 'string') {
    return res.status(400).json({ message: 'Invalid fee id' });
  }

  try {
    const fee = await prisma.fee.findFirst({
      where: {
        id: feeId,
        ...(session.user.role === 'ADMIN' ? { student: { adminId: session.user.id } } : {}),
      },
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    const updated = await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: 'PENDING',
        paidAmount: null,
        paidDate: null,
        paymentDetails: null,
        paymentProof: null,
        paidById: null,
        processedDate: new Date(),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error reverting fee:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
