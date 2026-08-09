import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can delete subjects' });
  }

  const { id } = req.body as { id?: string };

  if (!id) {
    return res.status(400).json({ message: 'Subject ID is required' });
  }

  try {
    // Verify subject belongs to this admin and fetch count of related records
    const subject = await prisma.course.findFirst({
      where: {
        id: id,
        adminId: session.user.id,
      },
      include: {
        _count: {
          select: {
            studentCourses: true,
            progressRecords: true,
            assignments: true,
            fees: true,
            testRecords: true,
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found or access denied' });
    }

    const { studentCourses, progressRecords, assignments, fees, testRecords } = subject._count;

    if (studentCourses > 0 || progressRecords > 0 || assignments > 0 || fees > 0 || testRecords > 0) {
      return res.status(400).json({
        message: 'Cannot delete subject because it is in use by students, teachers, assignments, or has academic/financial records.',
      });
    }

    await prisma.course.delete({
      where: { id: id },
    });

    res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
