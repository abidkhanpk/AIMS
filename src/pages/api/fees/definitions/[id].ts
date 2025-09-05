import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.query;

  const feeDefinition = await prisma.feeDefinition.findUnique({
    where: { id: String(id) },
  });

  if (!feeDefinition || feeDefinition.adminId !== (user.role === 'ADMIN' ? user.id : user.adminId)) {
    return res.status(404).json({ message: 'Fee definition not found' });
  }

  if (req.method === 'PUT') {
    const { title, description, amount, currency, type, generationDay, startDate, dueAfterDays } = req.body as any;

    try {
      const updatedFeeDefinition = await prisma.feeDefinition.update({
        where: { id: String(id) },
        data: {
          title,
          description,
          amount,
          currency,
          type,
          generationDay,
          startDate: new Date(startDate),
          dueAfterDays: typeof dueAfterDays === 'number' ? dueAfterDays : undefined,
        },
      });
      return res.status(200).json(updatedFeeDefinition);
    } catch (error) {
      console.error('Error updating fee definition:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.feeDefinition.delete({
        where: { id: String(id) },
      });
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting fee definition:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
