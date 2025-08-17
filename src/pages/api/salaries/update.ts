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
    return res.status(403).json({ message: 'Only admins can update salaries' });
  }

  const { id, title, description, amount, currency, dueDate } = req.body;

  if (!id || !title || !amount || !dueDate) {
    return res.status(400).json({ message: 'Salary ID, title, amount, and due date are required' });
  }

  try {
    // Verify salary belongs to this admin's teacher
    const existingSalary = await prisma.salary.findFirst({
      where: {
        id: id,
        teacher: {
          adminId: session.user.id
        }
      }
    });

    if (!existingSalary) {
      return res.status(404).json({ message: 'Salary not found or access denied' });
    }

    const updatedSalary = await prisma.salary.update({
      where: { id: id },
      data: {
        title,
        description: description || null,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        dueDate: new Date(dueDate),
      },
      include: {
        teacher: {
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

    res.status(200).json(updatedSalary);
  } catch (error) {
    console.error('Error updating salary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}