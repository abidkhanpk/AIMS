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
      let salaries;

      if (session.user.role === 'ADMIN') {
        // Admin can see all salaries for their teachers
        salaries = await prisma.salary.findMany({
          where: {
            teacher: {
              adminId: session.user.id,
              role: 'TEACHER'
            }
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'TEACHER') {
        // Teacher can see their own salaries
        salaries = await prisma.salary.findMany({
          where: {
            teacherId: session.user.id
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.status(200).json(salaries);
    } catch (error) {
      console.error('Error fetching salaries:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Only admins can create salaries
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create salaries' });
    }

    const { teacherId, title, description, amount, currency, dueDate } = req.body;

    if (!teacherId || !title || !amount || !dueDate) {
      return res.status(400).json({ message: 'Teacher ID, title, amount, and due date are required' });
    }

    try {
      // Verify teacher belongs to this admin
      const teacher = await prisma.user.findFirst({
        where: {
          id: teacherId,
          role: 'TEACHER',
          adminId: session.user.id
        }
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found or not under your administration' });
      }

      const salary = await prisma.salary.create({
        data: {
          teacherId,
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
          }
        }
      });

      // Create notification for teacher
      await prisma.notification.create({
        data: {
          type: 'SALARY_PAID',
          title: 'New Salary Due',
          message: `A new salary "${title}" of ${currency || 'USD'} ${amount} is due on ${new Date(dueDate).toLocaleDateString()}`,
          senderId: session.user.id,
          receiverId: teacherId,
        }
      });

      res.status(201).json(salary);
    } catch (error) {
      console.error('Error creating salary:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Only admins can update salaries
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update salaries' });
    }

    const { id, title, description, amount, currency, dueDate, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Salary ID is required' });
    }

    try {
      // Verify salary belongs to this admin's teacher
      const existingSalary = await prisma.salary.findFirst({
        where: {
          id,
          teacher: {
            adminId: session.user.id
          }
        }
      });

      if (!existingSalary) {
        return res.status(404).json({ message: 'Salary not found or access denied' });
      }

      const updatedSalary = await prisma.salary.update({
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
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}