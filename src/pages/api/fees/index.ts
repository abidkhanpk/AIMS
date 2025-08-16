import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let fees;

      if (session.user.role === 'ADMIN') {
        // Admin can see all fees for their students
        fees = await prisma.fee.findMany({
          where: {
            student: {
              adminId: session.user.id
            }
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'PARENT') {
        // Parent can see fees for their children
        const parentStudents = await prisma.parentStudent.findMany({
          where: { parentId: session.user.id },
          select: { studentId: true }
        });

        const studentIds = parentStudents.map(ps => ps.studentId);

        fees = await prisma.fee.findMany({
          where: {
            studentId: {
              in: studentIds
            }
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'STUDENT') {
        // Student can see their own fees
        fees = await prisma.fee.findMany({
          where: {
            studentId: session.user.id
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.status(200).json(fees);
    } catch (error) {
      console.error('Error fetching fees:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Only admins can create fees
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create fees' });
    }

    const { studentId, title, description, amount, dueDate } = req.body;

    if (!studentId || !title || !amount || !dueDate) {
      return res.status(400).json({ message: 'Student ID, title, amount, and due date are required' });
    }

    try {
      // Verify student belongs to this admin
      const student = await prisma.user.findFirst({
        where: {
          id: studentId,
          role: 'STUDENT',
          adminId: session.user.id
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found or not under your administration' });
      }

      const fee = await prisma.fee.create({
        data: {
          studentId,
          title,
          description: description || null,
          amount: parseFloat(amount),
          dueDate: new Date(dueDate),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      // Create notification for parents
      const parentStudents = await prisma.parentStudent.findMany({
        where: { studentId },
        include: { parent: true }
      });

      for (const parentStudent of parentStudents) {
        await prisma.notification.create({
          data: {
            type: 'FEE_DUE',
            title: 'New Fee Due',
            message: `A new fee "${title}" of $${amount} is due for ${student.name} on ${new Date(dueDate).toLocaleDateString()}`,
            senderId: session.user.id,
            receiverId: parentStudent.parent.id,
          }
        });
      }

      res.status(201).json(fee);
    } catch (error) {
      console.error('Error creating fee:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}