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

  // Only admins can pay salaries
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can pay salaries' });
  }

  const { salaryId } = req.body;

  if (!salaryId) {
    return res.status(400).json({ message: 'Salary ID is required' });
  }

  try {
    // Verify salary exists and belongs to this admin's teacher
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        teacher: {
          adminId: session.user.id
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!salary) {
      return res.status(404).json({ message: 'Salary not found or access denied' });
    }

    if (salary.status === 'PAID') {
      return res.status(400).json({ message: 'Salary is already paid' });
    }

    if (salary.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot pay a cancelled salary' });
    }

    // Update salary status to paid
    const updatedSalary = await prisma.salary.update({
      where: { id: salaryId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        paidById: session.user.id,
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

    // Create notification for teacher
    await prisma.notification.create({
      data: {
        type: 'SALARY_PAID',
        title: 'Salary Paid',
        message: `Your salary "${salary.title}" of ${salary.currency} ${salary.amount} has been paid.`,
        senderId: session.user.id,
        receiverId: salary.teacher.id,
      }
    });

    res.status(200).json(updatedSalary);
  } catch (error) {
    console.error('Error processing salary payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}