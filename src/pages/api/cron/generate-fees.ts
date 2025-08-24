import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { FeeType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify cron job authorization (you might want to add a secret key check)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    console.log(`Running fee generation cron job for ${today.toISOString()}`);

    // Get all active fee definitions
    const feeDefinitions = await prisma.feeDefinition.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: today } }
        ]
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            adminId: true,
          }
        }
      }
    });

    let generatedCount = 0;
    let skippedCount = 0;

    for (const definition of feeDefinitions) {
      try {
        // Skip if student has no admin (shouldn't happen but safety check)
        if (!definition.student.adminId) {
          skippedCount++;
          continue;
        }

        // Check if it's time to generate a fee for this definition
        const shouldGenerate = await shouldGenerateFee(definition, today);
        
        if (!shouldGenerate) {
          skippedCount++;
          continue;
        }

        // Calculate due date
        const dueDate = new Date(today);
        dueDate.setDate(definition.generationDay);

        // If generation day has passed this month, set for next period
        if (currentDay > definition.generationDay) {
          switch (definition.feeType) {
            case 'MONTHLY':
              dueDate.setMonth(dueDate.getMonth() + 1);
              break;
            case 'BIMONTHLY':
              dueDate.setMonth(dueDate.getMonth() + 2);
              break;
            case 'QUARTERLY':
              dueDate.setMonth(dueDate.getMonth() + 3);
              break;
            case 'HALF_YEARLY':
              dueDate.setMonth(dueDate.getMonth() + 6);
              break;
            case 'YEARLY':
              dueDate.setFullYear(dueDate.getFullYear() + 1);
              break;
          }
        }

        // Check if fee already exists for this period
        const existingFee = await prisma.fee.findFirst({
          where: {
            feeDefinitionId: definition.id,
            month: dueDate.getMonth() + 1,
            year: dueDate.getFullYear(),
          }
        });

        if (existingFee) {
          skippedCount++;
          continue;
        }

        // Create the fee
        const newFee = await prisma.fee.create({
          data: {
            studentId: definition.studentId,
            courseId: definition.courseId,
            feeDefinitionId: definition.id,
            title: definition.title,
            description: definition.description,
            amount: definition.amount,
            currency: definition.currency,
            dueDate: dueDate,
            month: dueDate.getMonth() + 1,
            year: dueDate.getFullYear(),
            isRecurring: definition.feeType !== 'ONCE',
          }
        });

        // Create notifications for all linked parents
        const parentStudents = await prisma.parentStudent.findMany({
          where: { studentId: definition.studentId },
          include: { parent: true }
        });

        for (const parentStudent of parentStudents) {
          await prisma.notification.create({
            data: {
              type: 'FEE_DUE',
              title: 'New Fee Generated',
              message: `A new fee "${definition.title}" of ${definition.currency} ${definition.amount} is due for ${definition.student.name} on ${dueDate.toLocaleDateString()}`,
              senderId: definition.student.adminId as string,
              receiverId: parentStudent.parent.id,
            }
          });
        }

        generatedCount++;
        console.log(`Generated fee for student ${definition.student.name}: ${definition.title}`);

      } catch (error) {
        console.error(`Error generating fee for definition ${definition.id}:`, error);
      }
    }

    console.log(`Fee generation completed. Generated: ${generatedCount}, Skipped: ${skippedCount}`);

    res.status(200).json({
      message: 'Fee generation completed',
      generated: generatedCount,
      skipped: skippedCount,
      total: feeDefinitions.length
    });

  } catch (error) {
    console.error('Error in fee generation cron job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function shouldGenerateFee(definition: any, today: Date): Promise<boolean> {
  const startDate = new Date(definition.startDate);
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Don't generate if start date is in the future
  if (startDate > today) {
    return false;
  }

  // Don't generate if end date has passed
  if (definition.endDate && new Date(definition.endDate) < today) {
    return false;
  }

  // For ONCE type, only generate if no fee exists yet
  if (definition.feeType === 'ONCE') {
    const existingFee = await prisma.fee.findFirst({
      where: { feeDefinitionId: definition.id }
    });
    return !existingFee;
  }

  // Check if it's the right day to generate
  if (currentDay !== definition.generationDay) {
    return false;
  }

  // Calculate if it's the right period based on fee type
  const monthsSinceStart = (currentYear - startDate.getFullYear()) * 12 + (currentMonth - (startDate.getMonth() + 1));

  switch (definition.feeType) {
    case 'MONTHLY':
      return monthsSinceStart >= 0;
    case 'BIMONTHLY':
      return monthsSinceStart >= 0 && monthsSinceStart % 2 === 0;
    case 'QUARTERLY':
      return monthsSinceStart >= 0 && monthsSinceStart % 3 === 0;
    case 'HALF_YEARLY':
      return monthsSinceStart >= 0 && monthsSinceStart % 6 === 0;
    case 'YEARLY':
      return monthsSinceStart >= 0 && monthsSinceStart % 12 === 0;
    default:
      return false;
  }
}