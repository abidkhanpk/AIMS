import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { teacherId } = req.query;

  try {
    let progress;

    if (session.user.role === 'ADMIN') {
      // Admin can see all progress for their students, with optional teacher filtering
      const whereClause: any = {
        student: {
          adminId: session.user.id
        }
      };

      // Add teacher filter if provided
      if (teacherId && typeof teacherId === 'string') {
        whereClause.teacherId = teacherId;
      }

      progress = await prisma.progress.findMany({
        where: whereClause,
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
          teacher: {
            select: {
              id: true,
              name: true,
            }
          },
          parentRemarks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      });
    } else if (session.user.role === 'TEACHER') {
      // Teacher can see progress for their assigned students
      const teacherStudents = await prisma.teacherStudent.findMany({
        where: { teacherId: session.user.id },
        select: { studentId: true }
      });

      const studentIds = teacherStudents.map(ts => ts.studentId);

      progress = await prisma.progress.findMany({
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
          teacher: {
            select: {
              id: true,
              name: true,
            }
          },
          parentRemarks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      });
    } else if (session.user.role === 'PARENT') {
      // Parent can see progress for their children
      const parentStudents = await prisma.parentStudent.findMany({
        where: { parentId: session.user.id },
        select: { studentId: true }
      });

      const studentIds = parentStudents.map(ps => ps.studentId);

      progress = await prisma.progress.findMany({
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
          teacher: {
            select: {
              id: true,
              name: true,
            }
          },
          parentRemarks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      });
    } else if (session.user.role === 'STUDENT') {
      // Student can see their own progress
      progress = await prisma.progress.findMany({
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
          teacher: {
            select: {
              id: true,
              name: true,
            }
          },
          parentRemarks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      });
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}