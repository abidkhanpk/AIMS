import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { ClassDay } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let assignments;

      if (session.user.role === 'ADMIN') {
        // Admin can see all assignments for their students
        assignments = await prisma.assignment.findMany({
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
                description: true,
              }
            },
            teacher: {
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
        // Teacher can see their assignments
        assignments = await prisma.assignment.findMany({
          where: {
            teacherId: session.user.id
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
                description: true,
              }
            },
            teacher: {
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
        // Student can see their own assignments
        assignments = await prisma.assignment.findMany({
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
                description: true,
              }
            },
            teacher: {
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

      res.status(200).json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Only admins can create assignments
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create assignments' });
    }

    const { 
      studentId, 
      courseId, 
      teacherId,
      assignmentDate,
      startTime,
      duration,
      classDays,
      monthlyFee,
      currency
    } = req.body;

    if (!studentId || !courseId || !teacherId) {
      return res.status(400).json({ message: 'Student ID, Course ID, and Teacher ID are required' });
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

      // Verify course belongs to this admin
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          adminId: session.user.id
        }
      });

      if (!course) {
        return res.status(404).json({ message: 'Course not found or not created by you' });
      }

      // Verify teacher belongs to this admin
      const teacher = await prisma.user.findFirst({
        where: {
          id: teacherId,
          role: 'TEACHER',
          adminId: session.user.id
        }
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found or not managed by you' });
      }

      // Get admin's default currency if not provided
      let assignmentCurrency = currency;
      if (!assignmentCurrency) {
        const settings = await prisma.settings.findUnique({
          where: { adminId: session.user.id },
          select: { defaultCurrency: true }
        });
        assignmentCurrency = settings?.defaultCurrency || 'USD';
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          studentId,
          courseId,
          teacherId
        }
      });

      if (existingAssignment) {
        return res.status(400).json({ message: 'Assignment already exists for this student, course, and teacher combination' });
      }

      // Create assignment
      const assignment = await prisma.assignment.create({
        data: {
          studentId,
          courseId,
          teacherId,
          assignmentDate: assignmentDate ? new Date(assignmentDate) : new Date(),
          startTime: startTime || null,
          duration: duration ? parseInt(duration) : null,
          classDays: classDays || [],
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          currency: assignmentCurrency,
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
              description: true,
            }
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      // If monthly fee is specified, create the first fee record
      if (monthlyFee && monthlyFee > 0) {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        
        await prisma.fee.create({
          data: {
            studentId,
            courseId,
            title: `${course.name} - Monthly Fee`,
            description: `Monthly fee for ${course.name} subject`,
            amount: parseFloat(monthlyFee),
            currency: assignmentCurrency,
            dueDate: nextMonth,
            month: nextMonth.getMonth() + 1,
            year: nextMonth.getFullYear(),
            isRecurring: true,
          }
        });
      }

      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Only admins can update assignments
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update assignments' });
    }

    const { 
      id,
      courseId,
      teacherId,
      assignmentDate,
      startTime,
      duration,
      classDays,
      monthlyFee,
      currency,
      timezone,
      isActive
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    try {
      // Verify assignment belongs to this admin's student
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingAssignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      const updatedAssignment = await prisma.assignment.update({
        where: { id },
        data: {
          ...(courseId && { courseId }),
          ...(teacherId && { teacherId }),
          ...(assignmentDate && { assignmentDate: new Date(assignmentDate) }),
          ...(startTime !== undefined && { startTime }),
          ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
          ...(classDays !== undefined && { classDays }),
          ...(monthlyFee !== undefined && { monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null }),
          ...(currency && { currency }),
          ...(timezone && { timezone }),
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
              description: true,
            }
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      res.status(200).json(updatedAssignment);
    } catch (error) {
      console.error('Error updating assignment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Only admins can delete assignments
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete assignments' });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    try {
      // Verify assignment belongs to this admin's student
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingAssignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      await prisma.assignment.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
