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

  if (session.user.role !== 'PARENT') {
    return res.status(403).json({ message: 'Only parents can access this endpoint' });
  }

  try {
    const parentAssignments = await prisma.parentStudent.findMany({
      where: { parentId: session.user.id },
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
                        name: true,
                      }
                    }
                  },
                  orderBy: { createdAt: 'desc' }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    const children = parentAssignments.map(assignment => assignment.student);

    res.status(200).json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}