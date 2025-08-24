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

  const { feeId, paidAmount, paymentDetails, paymentProof } = req.body;

  if (!feeId || !paidAmount) {
    return res.status(400).json({ message: 'Fee ID and paid amount are required' });
  }

  try {
    // Verify fee exists and user has permission to pay it
    let fee;
    
    if (session.user.role === 'PARENT') {
      // Parent can pay fees for their children
      const parentStudents = await prisma.parentStudent.findMany({
        where: { parentId: session.user.id },
        select: { studentId: true }
      });

      const studentIds = parentStudents.map(ps => ps.studentId);

      fee = await prisma.fee.findFirst({
        where: {
          id: feeId,
          studentId: {
            in: studentIds
          },
          status: {
            in: ['PENDING', 'OVERDUE']
          }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              adminId: true,
            }
          }
        }
      });
    } else if (session.user.role === 'STUDENT') {
      // Student can pay their own fees
      fee = await prisma.fee.findFirst({
        where: {
          id: feeId,
          studentId: session.user.id,
          status: {
            in: ['PENDING', 'OVERDUE']
          }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              adminId: true,
            }
          }
        }
      });
    } else {
      return res.status(403).json({ message: 'Only parents and students can pay fees' });
    }

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found or not eligible for payment' });
    }

    if (!fee.student.adminId) {
      return res.status(400).json({ message: 'Student has no assigned admin' });
    }

    // Update fee with payment information and set status to PROCESSING
    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        paidAmount: parseFloat(paidAmount),
        paymentDetails: paymentDetails || null,
        paymentProof: paymentProof || null,
        paidById: session.user.id,
        paidDate: new Date(),
        status: 'PROCESSING',
      },
      include: {
        student: {
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

    // Create notification for admin about payment processing
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_PROCESSING',
        title: 'Fee Payment Submitted',
        message: `Payment of ${fee.currency} ${paidAmount} has been submitted for fee "${fee.title}" by ${session.user.name} for student ${fee.student.name}. Please review and confirm.`,
        senderId: session.user.id,
        receiverId: fee.student.adminId,
      }
    });

    // Create notification for all linked parents about payment processing
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: fee.studentId },
      include: { parent: true }
    });

    for (const parentStudent of parentStudents) {
      // Don't notify the parent who made the payment
      if (parentStudent.parent.id !== session.user.id) {
        await prisma.notification.create({
          data: {
            type: 'PAYMENT_PROCESSING',
            title: 'Fee Payment Processing',
            message: `Payment for fee "${fee.title}" of ${fee.currency} ${paidAmount} is being processed for ${fee.student.name}.`,
            senderId: session.user.id,
            receiverId: parentStudent.parent.id,
          }
        });
      }
    }

    res.status(200).json({
      message: 'Payment submitted successfully and is being processed',
      fee: updatedFee
    });
  } catch (error) {
    console.error('Error processing fee payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}