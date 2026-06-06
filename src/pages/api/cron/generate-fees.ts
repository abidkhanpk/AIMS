import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Verify cron job authorization
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  const bodySecret = req.body?.secret;

  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    apiKey !== process.env.CRON_API_KEY &&
    bodySecret !== process.env.CRON_SECRET
  ) {
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

      const start = new Date(startDate);
      // Skip definitions where today is before the startDate
      if (today < start) continue;

      // Max days in the current month to normalize generationDay
      const maxDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const genDay = Math.min(generationDay, maxDays);

      let shouldGenerate = false;
      let dueDate = new Date();

      const refYear = start.getFullYear();
      const refMonth = start.getMonth();
      const monthsDiff = (today.getFullYear() - refYear) * 12 + (today.getMonth() - refMonth);

      if (monthsDiff >= 0) {
        switch (type) {
          case 'ONCE':
            if (monthsDiff === 0) {
              shouldGenerate = true;
            }
            break;
          case 'MONTHLY':
            shouldGenerate = true;
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
            if (monthsDiff % 12 === 0) {
              shouldGenerate = true;
            }
            break;
        }
      }

      if (shouldGenerate) {
        // Catch-up / retry gate: trigger if today's date is >= the target generation day of this month
        if (today.getDate() >= genDay) {
          // Check if a fee has already been generated for this definition for this student
          let existingFee = null;
          if (type === 'ONCE') {
            existingFee = await prisma.fee.findFirst({
              where: {
                feeDefinitionId: feeDefinitionId,
                studentId: student.id,
              },
            });
          } else {
            existingFee = await prisma.fee.findFirst({
              where: {
                feeDefinitionId: feeDefinitionId,
                studentId: student.id,
                month: today.getMonth() + 1,
                year: today.getFullYear(),
              },
            });
          }

          if (!existingFee) {
            const dueDays = typeof dueAfterDays === 'number' && !Number.isNaN(dueAfterDays) ? dueAfterDays : 7;
            dueDate = new Date(today.getFullYear(), today.getMonth(), genDay + dueDays);

            await prisma.fee.create({
              data: {
                studentId: student.id,
                feeDefinitionId: feeDefinitionId,
                title: title,
                amount: amount,
                currency: currency,
                dueDate: dueDate,
                status: 'PENDING',
                month: today.getMonth() + 1,
                year: today.getFullYear(),
              },
            });

            // Notify all associated parents
            const parentStudents = await prisma.parentStudent.findMany({
              where: { studentId: student.id },
              include: { parent: true }
            });

            for (const parentStudent of parentStudents) {
              await prisma.notification.create({
                data: {
                  type: 'FEE_DUE',
                  title: 'Fee Generated',
                  message: `A new fee "${title}" of ${currency} ${amount} has been generated for ${student.name}.`,
                  senderId: student.adminId || 'system',
                  receiverId: parentStudent.parent.id,
                }
              });
            }
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
