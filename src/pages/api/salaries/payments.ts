import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { teacherId } = req.query;

      if (!teacherId || typeof teacherId !== 'string') {
        return res.status(400).json({ message: 'teacherId is required' });
      }

      // Admin can see payments for their teachers, teacher can see their own
      if (session.user.role === 'ADMIN') {
        const payments = await prisma.salaryPayment.findMany({
          where: {
            teacherId,
            teacher: { adminId: session.user.id }
          },
          include: {
            salary: true,
            teacher: { select: { id: true, name: true } },
            admin: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        });

        const advances = await prisma.salaryAdvance.findMany({
          where: { teacherId, adminId: session.user.id },
          include: { repayments: true },
          orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ payments, advances });
      } else if (session.user.role === 'TEACHER' && session.user.id === teacherId) {
        const payments = await prisma.salaryPayment.findMany({
          where: { teacherId },
          include: { salary: true, admin: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        });
        const advances = await prisma.salaryAdvance.findMany({
          where: { teacherId },
          include: { repayments: true },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ payments, advances });
      }

      return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
      console.error('Error fetching salary payments:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Admin can record salary payment
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can record salary payments' });
    }

    const { teacherId, salaryId, amount, paidDate, paymentDetails, paymentProof } = req.body as {
      teacherId: string;
      salaryId?: string;
      amount: number;
      paidDate?: string;
      paymentDetails?: string;
      paymentProof?: string;
    };

    if (!teacherId || !amount) {
      return res.status(400).json({ message: 'teacherId and amount are required' });
    }

    try {
      // Verify teacher belongs to admin
      const teacher = await prisma.user.findFirst({
        where: { id: teacherId, role: 'TEACHER', adminId: session.user.id }
      });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found or not under your administration' });
      }

      // If salaryId is provided, verify it
      let salary: any = null;
      if (salaryId) {
        salary = await prisma.salary.findFirst({
          where: { id: salaryId, teacherId, teacher: { adminId: session.user.id } }
        });
        if (!salary) {
          return res.status(404).json({ message: 'Salary record not found' });
        }
      }

      const created = await prisma.$transaction(async (tx) => {
        // Create salary payment record
        const payment = await tx.salaryPayment.create({
          data: {
            teacherId,
            adminId: session.user.id,
            salaryId: salaryId || null,
            amount: parseFloat(String(amount)),
            paidDate: paidDate ? new Date(paidDate) : new Date(),
            paymentDetails: paymentDetails || null,
            paymentProof: paymentProof || null,
            currency: teacher.payCurrency || 'USD',
          }
        });

        // If linked to salary, mark as paid and attach details
        if (salaryId) {
          await tx.salary.update({
            where: { id: salaryId },
            data: {
              status: 'PAID',
              paidDate: payment.paidDate,
              paidById: session.user.id,
              paidAmount: payment.amount,
              paymentDetails: paymentDetails || null,
              paymentProof: paymentProof || null,
              processedDate: new Date(),
            }
          });
        }

        // Process active advances and deduct installment(s)
        const activeAdvances = await tx.salaryAdvance.findMany({
          where: { teacherId, adminId: session.user.id, status: 'ACTIVE' },
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

        // Notify teacher
        await tx.notification.create({
          data: {
            type: 'SALARY_PAID',
            title: 'Salary Payment Recorded',
            message: `A salary payment of ${teacher.payCurrency || 'USD'} ${payment.amount.toFixed(2)} has been recorded.`,
            senderId: session.user.id,
            receiverId: teacherId
          }
        });

        return payment;
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error('Error recording salary payment:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
