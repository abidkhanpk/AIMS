import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.method === 'POST') {
    const {
      title,
      description,
      amount,
      currency,
      type,
      generationDay,
      startDate,
      studentId,
      courseId,
    } = req.body;

    try {
      const feeDefinition = await prisma.feeDefinition.create({
        data: {
          title,
          description,
          amount,
          currency,
          type,
          generationDay,
          startDate: new Date(startDate),
          adminId: user.role === 'ADMIN' ? user.id : user.adminId,
          studentId,
          courseId,
        },
      });
      return res.status(201).json(feeDefinition);
    } catch (error) {
      console.error('Error creating fee definition:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const feeDefinitions = await prisma.feeDefinition.findMany({
        where: {
          adminId: user.role === 'ADMIN' ? user.id : user.adminId,
        },
        include: {
          student: true,
          course: true,
        },
      });
      return res.status(200).json(feeDefinitions);
    } catch (error) {
      console.error('Error fetching fee definitions:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['POST', 'GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
