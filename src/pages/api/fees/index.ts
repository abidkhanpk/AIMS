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
            },
            course: {
              select: {
                id: true,
                name: true,
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
            },
            course: {
              select: {
                id: true,
                name: true,
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
            },
            course: {
              select: {
                id: true,
                name: true,
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

    const { 
      studentId, 
      courseId, 
      title, 
      description, 
      amount, 
      currency, 
      dueDate,
      month,
      year,
      isRecurring 
    } = req.body;

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

      // Get admin's default currency if not provided
      let feeCurrency = currency;
      if (!feeCurrency) {
        const settings = await prisma.settings.findUnique({
          where: { adminId: session.user.id },
          select: { defaultCurrency: true }
        });
        feeCurrency = settings?.defaultCurrency || 'USD';
      }

      const fee = await prisma.fee.create({
        data: {
          studentId,
          courseId: courseId || null,
          title,
          description: description || null,
          amount: parseFloat(amount),
          currency: feeCurrency,
          dueDate: new Date(dueDate),
          month: month || null,
          year: year || null,
          isRecurring: isRecurring || false,
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

      // Create notifications for ALL associated parents
      const parentStudents = await prisma.parentStudent.findMany({
        where: { studentId },
        include: { 
          parent: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      // Send notification to each associated parent
      for (const parentStudent of parentStudents) {
        await prisma.notification.create({
          data: {
            type: 'FEE_DUE',
            title: 'New Fee Due',
            message: `A new fee "${title}" of ${feeCurrency} ${amount} is due for ${student.name} on ${new Date(dueDate).toLocaleDateString()}`,
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
  } else if (req.method === 'PUT') {
    // Only admins can update fees
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update fees' });
    }

    const { id, title, description, amount, currency, dueDate, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Fee ID is required' });
    }

    try {
      // Verify fee belongs to this admin's student
      const existingFee = await prisma.fee.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingFee) {
        return res.status(404).json({ message: 'Fee not found or access denied' });
      }

      const updatedFee = await prisma.fee.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(amount && { amount: parseFloat(amount) }),
          ...(currency && { currency }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(status && { status }),
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
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}