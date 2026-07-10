import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userRole = session.user.role;
  const userId = session.user.id;
  const type = req.query.type as string;

  // Developer can fetch admins with phone numbers
  if (type === 'admins') {
    if (userRole !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Only developers can fetch admin recipients' });
    }

    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        mobile: { not: null },
        isWhatsApp: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isActive: true,
        settings: {
          select: {
            appTitle: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(admins);
  }

  // Admin can fetch parents with phone numbers (only their own academy's parents)
  if (type === 'parents') {
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can fetch parent recipients' });
    }

    const parents = await prisma.user.findMany({
      where: {
        role: 'PARENT',
        adminId: userId,
        mobile: { not: null },
        isWhatsApp: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        parentChildren: {
          where: {
            contactForStudentInfo: true,
          },
          select: {
            id: true,
            relationType: true,
            contactForStudentInfo: true,
            student: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Only include parents who have at least one child with contactForStudentInfo = true
    const filtered = parents.filter(p => p.parentChildren.length > 0);

    return res.json(filtered);
  }

  // Admin can fetch teachers with phone numbers
  if (type === 'teachers') {
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can fetch teacher recipients' });
    }

    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        adminId: userId,
        mobile: { not: null },
        isWhatsApp: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        qualification: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json(teachers);
  }

  // Admin can fetch students with overdue fees (for fee reminders)
  if (type === 'overdue-fees') {
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can fetch fee data' });
    }

    const fees = await prisma.fee.findMany({
      where: {
        student: { adminId: userId },
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lte: new Date() },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        dueDate: true,
        status: true,
        student: {
          select: {
            id: true,
            name: true,
            studentParents: {
              where: {
                contactForStudentInfo: true,
                parent: {
                  mobile: { not: null },
                  isWhatsApp: true,
                },
              },
              select: {
                parent: {
                  select: {
                    id: true,
                    name: true,
                    mobile: true,
                  },
                },
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return res.json(fees);
  }

  // Admin can fetch today's absent students (for attendance alerts)
  if (type === 'absent-today') {
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can fetch attendance data' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const absences = await prisma.progress.findMany({
      where: {
        student: { adminId: userId },
        attendance: 'ABSENT',
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        date: true,
        student: {
          select: {
            id: true,
            name: true,
            studentParents: {
              where: {
                contactForStudentInfo: true,
                parent: {
                  mobile: { not: null },
                  isWhatsApp: true,
                },
              },
              select: {
                parent: {
                  select: {
                    id: true,
                    name: true,
                    mobile: true,
                  },
                },
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json(absences);
  }

  // Admin can fetch recently paid fees (for payment confirmations)
  if (type === 'recent-payments') {
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can fetch payment data' });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const payments = await prisma.fee.findMany({
      where: {
        student: { adminId: userId },
        status: 'PAID',
        paidDate: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        paidDate: true,
        student: {
          select: {
            id: true,
            name: true,
            studentParents: {
              where: {
                contactForStudentInfo: true,
                parent: {
                  mobile: { not: null },
                  isWhatsApp: true,
                },
              },
              select: {
                parent: {
                  select: {
                    id: true,
                    name: true,
                    mobile: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paidDate: 'desc' },
    });

    return res.json(payments);
  }

  return res.status(400).json({ message: 'Invalid type parameter. Use: admins, parents, teachers, overdue-fees, absent-today, recent-payments' });
}
