import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only admins can pay salaries
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can pay salaries' });
  }

  const { salaryId } = req.body;

  if (!salaryId) {
    return res.status(400).json({ message: 'Salary ID is required' });
  }

  try {
    // Verify salary exists and belongs to this admin's teacher
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        teacher: {
          adminId: session.user.id
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            payCurrency: true,
          }
        }
      }
    });

    if (!salary) {
      return res.status(404).json({ message: 'Salary not found or access denied' });
    }

    if (salary.status === 'PAID') {
      return res.status(400).json({ message: 'Salary is already paid' });
    }

    if (salary.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot pay a cancelled salary' });
    }

    // Process direct salary payment inside a transaction
    const updatedSalary = await prisma.$transaction(async (tx) => {
      // 1. Create a SalaryPayment record in the ledger
      const payment = await tx.salaryPayment.create({
        data: {
          teacherId: salary.teacherId,
          adminId: session.user.id,
          salaryId: salary.id,
          amount: salary.amount,
          paidDate: new Date(),
          paymentDetails: `Paid via Salaries dashboard: ${salary.title}`,
          currency: salary.currency,
        }
      });

      // 2. Mark salary record as PAID
      const updated = await tx.salary.update({
        where: { id: salaryId },
        data: {
          status: 'PAID',
          paidDate: payment.paidDate,
          paidById: session.user.id,
          paidAmount: salary.amount,
          paymentDetails: payment.paymentDetails,
          processedDate: new Date(),
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      // 3. Process active advances and deduct installment(s)
      const activeAdvances = await tx.salaryAdvance.findMany({
        where: { teacherId: salary.teacherId, adminId: session.user.id, status: 'ACTIVE' },
        orderBy: { issuedDate: 'asc' }
      });

      for (const adv of activeAdvances) {
        if (adv.balance <= 0) {
          await tx.salaryAdvance.update({ where: { id: adv.id }, data: { status: 'COMPLETED' } });
          continue;
        }
        const installment = Math.min(adv.installmentAmount, adv.balance);
        if (installment > 0) {
          await tx.salaryAdvanceRepayment.create({
            data: {
              advanceId: adv.id,
              amount: installment,
              date: payment.paidDate,
              salaryPaymentId: payment.id
            }
          });
          const newBalance = adv.balance - installment;
          await tx.salaryAdvance.update({
            where: { id: adv.id },
            data: { balance: newBalance, status: newBalance <= 0 ? 'COMPLETED' : 'ACTIVE' }
          });
        }
      }

      // 4. Create notification for teacher
      await tx.notification.create({
        data: {
          type: 'SALARY_PAID',
          title: 'Salary Paid',
          message: `Your salary "${salary.title}" of ${salary.currency} ${salary.amount} has been paid.`,
          senderId: session.user.id,
          receiverId: salary.teacherId,
        }
      });

      return updated;
    });

    res.status(200).json(updatedSalary);
  } catch (error) {
    console.error('Error processing salary payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}