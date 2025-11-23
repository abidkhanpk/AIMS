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

  if (session.user.role !== 'STUDENT') {
    return res.status(403).json({ message: 'Only students can access this endpoint' });
  }

  try {
    const studentData = await prisma.user.findUnique({
      where: { id: session.user.id },
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
            examTemplate: true,
          },
          orderBy: { performedAt: 'desc' }
        }
      }
    });

    if (!studentData) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!studentData) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Rename studentTestRecords -> testRecords for frontend compatibility
    const { studentTestRecords, ...rest } = studentData as any;
    res.status(200).json({
      ...rest,
      testRecords: studentTestRecords || [],
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
