import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can update fees' });
  }

  const { id, title, description, amount, currency, dueDate } = req.body;

  if (!id || !title || !amount || !dueDate) {
    return res.status(400).json({ message: 'Fee ID, title, amount, and due date are required' });
  }

  try {
    // Verify fee belongs to this admin's student
    const existingFee = await prisma.fee.findFirst({
      where: {
        id: id,
        student: {
          adminId: session.user.id
        }
      }
    });

    if (!existingFee) {
      return res.status(404).json({ message: 'Fee not found or access denied' });
    }

    const updatedFee = await prisma.fee.update({
      where: { id: id },
      data: {
        title,
        description: description || null,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        dueDate: new Date(dueDate),
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

    res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}