import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Add a secret to protect the endpoint
  const { secret } = req.body;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const feeDefinitions: any[] = await (prisma as any).feeDefinition.findMany();
    const today = new Date();

    for (const fd of feeDefinitions) {
      const generationDay = fd.generationDay;
      const startDate = new Date(fd.startDate);

      if (today.getDate() === generationDay) {
        let shouldGenerate = false;
        let dueDate = new Date();

        switch (fd.type) {
          case 'ONCE':
            if (
              startDate.getFullYear() === today.getFullYear() &&
              startDate.getMonth() === today.getMonth() &&
              startDate.getDate() === today.getDate()
            ) {
              shouldGenerate = true;
              dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + 15);
            }
            break;
          case 'MONTHLY':
            shouldGenerate = true;
            dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + 15);
            break;
          case 'BIMONTHLY':
            if ((today.getMonth() - startDate.getMonth()) % 2 === 0) {
              shouldGenerate = true;
              dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + 15);
            }
            break;
          case 'QUARTERLY':
            if ((today.getMonth() - startDate.getMonth()) % 3 === 0) {
              shouldGenerate = true;
              dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + 15);
            }
            break;
          case 'HALFYEARLY':
            if ((today.getMonth() - startDate.getMonth()) % 6 === 0) {
              shouldGenerate = true;
              dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + 15);
            }
            break;
          case 'YEARLY':
            if (today.getMonth() === startDate.getMonth()) {
              shouldGenerate = true;
              dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + 15);
            }
            break;
        }

        if (shouldGenerate) {
          // Check if a fee has already been generated for this period
          const existingFee = await prisma.fee.findFirst({
            where: {
              feeDefinitionId: fd.id,
              dueDate: {
                gte: new Date(today.getFullYear(), today.getMonth(), 1),
                lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
              },
            },
          });

          if (!existingFee) {
            await prisma.fee.create({
              data: {
                studentId: fd.studentId,
                feeDefinitionId: fd.id,
                dueDate,
                status: 'PENDING',
              },
            });
          }
        }
      }
    }

    return res.status(200).json({ message: 'Fee generation completed successfully' });
  } catch (error) {
    console.error('Error generating fees:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
