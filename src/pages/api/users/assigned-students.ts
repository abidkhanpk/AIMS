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

  if (session.user.role !== 'TEACHER') {
    return res.status(403).json({ message: 'Only teachers can access this endpoint' });
  }

  try {
    const teacherAssignments = await prisma.teacherStudent.findMany({
      where: { teacherId: session.user.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentCourses: {
              include: {
                course: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  }
                }
              }
            },
            progressRecords: {
              include: {
                course: {
                  select: {
                    id: true,
                    name: true,
                  }
                },
                parentRemarks: {
                  include: {
                    parent: {
                      select: {
                        name: true,
                      }
                    },
                    replies: {
                      include: {
                        author: {
                          select: {
                            id: true,
                            name: true,
                            role: true,
                          }
                        }
                      },
                      orderBy: { createdAt: 'asc' }
                    }
                  },
                  orderBy: { createdAt: 'desc' }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            studentTestRecords: {
              include: {
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
              },
              orderBy: { performedAt: 'desc' }
            }
          }
        }
      }
    });

    const students = teacherAssignments.map(({ student }) => {
      const { studentTestRecords, ...rest } = student as any;
      return {
        ...rest,
        testRecords: studentTestRecords || [],
      };
    });

    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching assigned students:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
