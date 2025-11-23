import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { AssessmentType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const {
    id,
    title,
    type,
    performedAt,
    maxMarks,
    obtainedMarks,
    performanceNote,
    remarks,
  } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Test record ID is required' });
  }

  const validTypes: AssessmentType[] = ['QUIZ', 'EXAM', 'HOMEWORK', 'OTHER'];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid assessment type' });
  }

  try {
    const existing = await prisma.testRecord.findUnique({
      where: { id },
      include: { student: true, course: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Test record not found' });
    }

    // Permissions: teacher who created it, or admin of the student
    let permitted = false;
    if (session.user.role === 'TEACHER') {
      permitted = existing.teacherId === session.user.id;
    } else if (session.user.role === 'ADMIN') {
      permitted = existing.student.adminId === session.user.id;
    }

    if (!permitted) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let resolvedTitle = title ?? existing.title;
    let resolvedType: AssessmentType = (type as AssessmentType) || existing.type;
    let resolvedMax = maxMarks !== undefined ? parseFloat(maxMarks) : existing.maxMarks;
    let resolvedObtained = obtainedMarks !== undefined ? parseFloat(obtainedMarks) : existing.obtainedMarks;
    const resolvedTemplateId = null; // templates removed

    if (!resolvedTitle) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!resolvedMax || resolvedMax <= 0) {
      return res.status(400).json({ message: 'Maximum marks must be greater than zero' });
    }
    if (resolvedObtained === undefined || resolvedObtained === null || resolvedObtained < 0) {
      return res.status(400).json({ message: 'Obtained marks are required' });
    }

    const percentage = Math.max(0, Math.min(100, (resolvedObtained / resolvedMax) * 100));

    const updated = await prisma.testRecord.update({
      where: { id },
      data: {
        title: resolvedTitle,
        type: resolvedType,
        performedAt: performedAt ? new Date(performedAt) : existing.performedAt,
        maxMarks: resolvedMax,
        obtainedMarks: resolvedObtained,
        percentage: parseFloat(percentage.toFixed(2)),
        performanceNote: performanceNote ?? existing.performanceNote,
        remarks: remarks ?? existing.remarks,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error editing test record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
