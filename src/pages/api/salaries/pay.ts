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

  const { salaryId, paidAmount, paymentDetails, paymentProof, advanceDeduction } = req.body;

  if (!salaryId || !paidAmount) {
    return res.status(400).json({ message: 'Salary ID and paid amount are required' });
  }

  try {
    // Verify salary exists and belongs to this admin's teacher
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        teacher: {
          adminId: session.user.id
        },
        status: {
          in: ['PENDING', 'OVERDUE']
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!salary) {
      return res.status(404).json({ message: 'Salary not found or not eligible for payment' });
    }

    // Handle advance deduction if provided
    let finalPaidAmount = parseFloat(paidAmount);
    let deductionAmount = 0;

    if (advanceDeduction && parseFloat(advanceDeduction) > 0) {
      deductionAmount = parseFloat(advanceDeduction);
      finalPaidAmount = Math.max(0, finalPaidAmount - deductionAmount);

      // Update advance repayment
      const activeAdvance = await prisma.salaryAdvance.findFirst({
        where: {
          teacherId: salary.teacherId,
          status: 'APPROVED',
          isFullyRepaid: false,
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      if (activeAdvance && activeAdvance.remainingAmount && activeAdvance.remainingAmount > 0) {
        const repaymentAmount = Math.min(deductionAmount, activeAdvance.remainingAmount);
        const newTotalRepaid = activeAdvance.totalRepaid + repaymentAmount;
        const newRemainingAmount = (activeAdvance.approvedAmount || 0) - newTotalRepaid;
        const isFullyRepaid = newRemainingAmount <= 0;

        await prisma.salaryAdvance.update({
          where: { id: activeAdvance.id },
          data: {
            totalRepaid: newTotalRepaid,
            remainingAmount: Math.max(0, newRemainingAmount),
            isFullyRepaid,
            status: isFullyRepaid ? 'REPAID' : 'APPROVED',
          }
        });

        // Create notification for teacher if advance is fully repaid
        if (isFullyRepaid) {
          await prisma.notification.create({
            data: {
              type: 'SALARY_ADVANCE_REPAID',
              title: 'Salary Advance Fully Repaid',
              message: `Your salary advance has been fully repaid through salary deductions. Total amount: ${activeAdvance.approvedAmount}`,
              senderId: session.user.id,
              receiverId: salary.teacherId,
            }
          });
        }
      }
    }

    // Update salary with payment information
    const updatedSalary = await prisma.salary.update({
      where: { id: salaryId },
      data: {
        paidAmount: finalPaidAmount,
        paymentDetails: paymentDetails || null,
        paymentProof: paymentProof || null,
        paidById: session.user.id,
        paidDate: new Date(),
        processedDate: new Date(),
        status: 'PAID',
        advanceDeduction: deductionAmount > 0 ? deductionAmount : null,
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

    // Create notification for teacher
    let notificationMessage = `Your salary "${salary.title}" of ${salary.currency} ${finalPaidAmount} has been paid.`;
    if (deductionAmount > 0) {
      notificationMessage += ` (${salary.currency} ${deductionAmount} was deducted for advance repayment)`;
    }

    await prisma.notification.create({
      data: {
        type: 'SALARY_PAID',
        title: 'Salary Payment Processed',
        message: notificationMessage,
        senderId: session.user.id,
        receiverId: salary.teacherId,
      }
    });

    res.status(200).json({
      message: 'Salary payment processed successfully',
      salary: updatedSalary,
      advanceDeduction: deductionAmount
    });
  } catch (error) {
    console.error('Error processing salary payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}