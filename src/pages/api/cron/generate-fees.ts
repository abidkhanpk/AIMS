import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { secret } = req.body;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const studentFeeDefinitions = await prisma.studentFeeDefinition.findMany({
      include: {
        student: true,
        feeDefinition: true,
      },
    });

    const today = new Date();

    for (const sfd of studentFeeDefinitions) {
      const { student, feeDefinition } = sfd;
      if (!feeDefinition) continue;

      const { generationDay, startDate, type, title, amount, currency, id: feeDefinitionId, dueAfterDays } = feeDefinition as any;

      if (today.getDate() === generationDay) {
        let shouldGenerate = false;
        let dueDate = new Date();

        const refYear = startDate.getFullYear();
        const refMonth = startDate.getMonth();
        const monthsDiff = (today.getFullYear() - refYear) * 12 + (today.getMonth() - refMonth);

        switch (type) {
          case 'ONCE':
            if (
              startDate.getFullYear() === today.getFullYear() &&
              startDate.getMonth() === today.getMonth() &&
              today.getDate() === generationDay
            ) {
              shouldGenerate = true;
            }
            break;
          case 'MONTHLY':
            shouldGenerate = true; // generation day gate already applied above
            break;
          case 'BIMONTHLY':
            if (monthsDiff % 2 === 0) {
              shouldGenerate = true;
            }
            break;
          case 'QUARTERLY':
            if (monthsDiff % 3 === 0) {
              shouldGenerate = true;
            }
            break;
          case 'HALFYEARLY':
            if (monthsDiff % 6 === 0) {
              shouldGenerate = true;
            }
            break;
          case 'YEARLY':
            if (today.getMonth() === startDate.getMonth()) {
              shouldGenerate = true;
            }
            break;
        }

        if (shouldGenerate) {
          const dueDays = typeof dueAfterDays === 'number' && !Number.isNaN(dueAfterDays) ? dueAfterDays : 7;
          dueDate = new Date(today.getFullYear(), today.getMonth(), generationDay + dueDays);
        }

        if (shouldGenerate) {
          const existingFee = await prisma.fee.findFirst({
            where: {
              feeDefinitionId: feeDefinitionId,
              studentId: student.id,
              dueDate: {
                gte: new Date(today.getFullYear(), today.getMonth(), 1),
                lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
              },
            },
          });

          if (!existingFee) {
            await prisma.fee.create({
              data: {
                studentId: student.id,
                feeDefinitionId: feeDefinitionId,
                title: title,
                amount: amount,
                currency: currency,
                dueDate: dueDate,
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
