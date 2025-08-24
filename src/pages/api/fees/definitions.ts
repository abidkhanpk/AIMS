import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { FeeType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let feeDefinitions;

      if (session.user.role === 'ADMIN') {
        // Admin can see all fee definitions for their students
        feeDefinitions = await prisma.feeDefinition.findMany({
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
            course: {
              select: {
                id: true,
                name: true,
              }
            },
            _count: {
              select: {
                fees: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'PARENT') {
        // Parent can see fee definitions for their children
        const parentStudents = await prisma.parentStudent.findMany({
          where: { parentId: session.user.id },
          select: { studentId: true }
        });

        const studentIds = parentStudents.map(ps => ps.studentId);

        feeDefinitions = await prisma.feeDefinition.findMany({
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
            course: {
              select: {
                id: true,
                name: true,
              }
            },
            _count: {
              select: {
                fees: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'STUDENT') {
        // Student can see their own fee definitions
        feeDefinitions = await prisma.feeDefinition.findMany({
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
            course: {
              select: {
                id: true,
                name: true,
              }
            },
            _count: {
              select: {
                fees: true
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

      res.status(200).json(feeDefinitions);
    } catch (error) {
      console.error('Error fetching fee definitions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Only admins can create fee definitions
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create fee definitions' });
    }

    const { 
      studentId, 
      courseId, 
      title, 
      description, 
      amount, 
      currency, 
      feeType,
      generationDay,
      startDate,
      endDate
    } = req.body;

    if (!studentId || !title || !amount || !feeType || !generationDay || !startDate) {
      return res.status(400).json({ message: 'Student ID, title, amount, fee type, generation day, and start date are required' });
    }

    // Validate generation day
    if (generationDay < 1 || generationDay > 31) {
      return res.status(400).json({ message: 'Generation day must be between 1 and 31' });
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

      const feeDefinition = await prisma.feeDefinition.create({
        data: {
          studentId,
          courseId: courseId || null,
          title,
          description: description || null,
          amount: parseFloat(amount),
          currency: feeCurrency,
          feeType: feeType as FeeType,
          generationDay: parseInt(generationDay),
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
        },
        include: {
          student: {
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
        }
      });

      // Generate the first fee if it's due
      await generateFeesFromDefinition(feeDefinition);

      res.status(201).json(feeDefinition);
    } catch (error) {
      console.error('Error creating fee definition:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Only admins can update fee definitions
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update fee definitions' });
    }

    const { 
      id, 
      title, 
      description, 
      amount, 
      currency, 
      feeType,
      generationDay,
      startDate,
      endDate,
      isActive
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Fee definition ID is required' });
    }

    try {
      // Verify fee definition belongs to this admin's student
      const existingDefinition = await prisma.feeDefinition.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingDefinition) {
        return res.status(404).json({ message: 'Fee definition not found or access denied' });
      }

      const updatedDefinition = await prisma.feeDefinition.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(amount && { amount: parseFloat(amount) }),
          ...(currency && { currency }),
          ...(feeType && { feeType: feeType as FeeType }),
          ...(generationDay && { generationDay: parseInt(generationDay) }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          student: {
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
        }
      });

      res.status(200).json(updatedDefinition);
    } catch (error) {
      console.error('Error updating fee definition:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Only admins can delete fee definitions
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete fee definitions' });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Fee definition ID is required' });
    }

    try {
      // Verify fee definition belongs to this admin's student
      const existingDefinition = await prisma.feeDefinition.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingDefinition) {
        return res.status(404).json({ message: 'Fee definition not found or access denied' });
      }

      // Delete the fee definition (this will also delete related fees due to cascade)
      await prisma.feeDefinition.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Fee definition deleted successfully' });
    } catch (error) {
      console.error('Error deleting fee definition:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

// Helper function to generate fees from definition
async function generateFeesFromDefinition(feeDefinition: any) {
  const now = new Date();
  const startDate = new Date(feeDefinition.startDate);
  
  // Calculate next due date based on fee type and generation day
  let nextDueDate = new Date(startDate);
  nextDueDate.setDate(feeDefinition.generationDay);
  
  // If the generation day has passed this month, move to next period
  if (nextDueDate <= now) {
    switch (feeDefinition.feeType) {
      case 'MONTHLY':
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
      case 'BIMONTHLY':
        nextDueDate.setMonth(nextDueDate.getMonth() + 2);
        break;
      case 'QUARTERLY':
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
        break;
      case 'HALF_YEARLY':
        nextDueDate.setMonth(nextDueDate.getMonth() + 6);
        break;
      case 'YEARLY':
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        break;
      case 'ONCE':
        // For one-time fees, use the start date as due date
        nextDueDate = startDate;
        break;
    }
  }

  // Check if end date has passed
  if (feeDefinition.endDate && nextDueDate > new Date(feeDefinition.endDate)) {
    return;
  }

  // Check if fee already exists for this period
  const existingFee = await prisma.fee.findFirst({
    where: {
      feeDefinitionId: feeDefinition.id,
      dueDate: nextDueDate,
    }
  });

  if (!existingFee) {
    // Create the fee
    await prisma.fee.create({
      data: {
        studentId: feeDefinition.studentId,
        courseId: feeDefinition.courseId,
        feeDefinitionId: feeDefinition.id,
        title: feeDefinition.title,
        description: feeDefinition.description,
        amount: feeDefinition.amount,
        currency: feeDefinition.currency,
        dueDate: nextDueDate,
        month: nextDueDate.getMonth() + 1,
        year: nextDueDate.getFullYear(),
        isRecurring: feeDefinition.feeType !== 'ONCE',
      }
    });

    // Create notifications for all linked parents
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: feeDefinition.studentId },
      include: { parent: true, student: true }
    });

    for (const parentStudent of parentStudents) {
      await prisma.notification.create({
        data: {
          type: 'FEE_DUE',
          title: 'New Fee Due',
          message: `A new fee "${feeDefinition.title}" of ${feeDefinition.currency} ${feeDefinition.amount} is due for ${parentStudent.student.name} on ${nextDueDate.toLocaleDateString()}`,
          senderId: feeDefinition.student.adminId,
          receiverId: parentStudent.parent.id,
        }
      });
    }
  }
}