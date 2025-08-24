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

  const { 
    feeId, 
    paidAmount, 
    paymentDetails, 
    paymentProof 
  } = req.body;

  if (!feeId || !paidAmount) {
    return res.status(400).json({ message: 'Fee ID and paid amount are required' });
  }

  try {
    // Verify the fee exists and user has permission to pay it
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          include: {
            studentParents: {
              include: {
                parent: true
              }
            }
          }
        }
      }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    // Check if user is a parent of the student or the student themselves
    let hasPermission = false;
    if (session.user.role === 'PARENT') {
      hasPermission = fee.student.studentParents.some(sp => sp.parent.id === session.user.id);
    } else if (session.user.role === 'STUDENT') {
      hasPermission = fee.studentId === session.user.id;
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fee with payment information and set status to PROCESSING
    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: 'PROCESSING',
        paidAmount: parseFloat(paidAmount),
        paymentDetails: paymentDetails || null,
        paymentProof: paymentProof || null,
        paidDate: new Date(),
        paidById: session.user.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            adminId: true,
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

    // Create notification for admin about payment submission
    if (fee.student.adminId) {
      await prisma.notification.create({
        data: {
          type: 'PAYMENT_PROCESSING',
          title: 'Fee Payment Submitted',
          message: `Payment for "${fee.title}" (${fee.currency} ${paidAmount}) has been submitted by ${session.user.name} and is awaiting verification`,
          senderId: session.user.id,
          receiverId: fee.student.adminId,
        }
      });
    }

    res.status(200).json(updatedFee);
  } catch (error) {
    console.error('Error processing fee payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}