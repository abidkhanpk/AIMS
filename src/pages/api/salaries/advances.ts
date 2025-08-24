import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { SalaryAdvanceStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let advances;

      if (session.user.role === 'ADMIN') {
        // Admin can see all advances for their teachers
        advances = await prisma.salaryAdvance.findMany({
          where: {
            teacher: {
              adminId: session.user.id,
              role: 'TEACHER'
            }
          },
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'TEACHER') {
        // Teacher can see their own advances
        advances = await prisma.salaryAdvance.findMany({
          where: {
            teacherId: session.user.id
          },
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.status(200).json(advances);
    } catch (error) {
      console.error('Error fetching salary advances:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Teachers can request advances, admins can approve/reject
    const { teacherId, requestedAmount, reason, repaymentMonths, action, advanceId, approvedAmount, rejectionReason } = req.body;

    if (action === 'request') {
      // Teacher requesting advance
      if (session.user.role !== 'TEACHER') {
        return res.status(403).json({ message: 'Only teachers can request salary advances' });
      }

      if (!requestedAmount || !reason || !repaymentMonths) {
        return res.status(400).json({ message: 'Requested amount, reason, and repayment months are required' });
      }

      try {
        // Check if teacher has any pending advances
        const pendingAdvance = await prisma.salaryAdvance.findFirst({
          where: {
            teacherId: session.user.id,
            status: 'PENDING'
          }
        });

        if (pendingAdvance) {
          return res.status(400).json({ message: 'You already have a pending advance request' });
        }

        const advance = await prisma.salaryAdvance.create({
          data: {
            teacherId: session.user.id,
            requestedAmount: parseFloat(requestedAmount),
            reason,
            repaymentMonths: parseInt(repaymentMonths),
          },
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                adminId: true,
              }
            }
          }
        });

        // Create notification for admin if adminId exists
        if (advance.teacher.adminId) {
          await prisma.notification.create({
            data: {
              type: 'SALARY_ADVANCE_APPROVED',
              title: 'Salary Advance Request',
              message: `${advance.teacher.name} has requested a salary advance of ${requestedAmount} to be repaid over ${repaymentMonths} months. Reason: ${reason}`,
              senderId: session.user.id,
              receiverId: advance.teacher.adminId,
            }
          });
        }

        res.status(201).json(advance);
      } catch (error) {
        console.error('Error creating salary advance request:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    } else if (action === 'approve' || action === 'reject') {
      // Admin approving/rejecting advance
      if (session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only admins can approve/reject salary advances' });
      }

      if (!advanceId) {
        return res.status(400).json({ message: 'Advance ID is required' });
      }

      if (action === 'approve' && !approvedAmount) {
        return res.status(400).json({ message: 'Approved amount is required' });
      }

      if (action === 'reject' && !rejectionReason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      try {
        // Verify advance belongs to this admin's teacher
        const existingAdvance = await prisma.salaryAdvance.findFirst({
          where: {
            id: advanceId,
            teacher: {
              adminId: session.user.id
            },
            status: 'PENDING'
          },
          include: {
            teacher: true
          }
        });

        if (!existingAdvance) {
          return res.status(404).json({ message: 'Advance request not found or already processed' });
        }

        let updateData: any = {
          approvedById: session.user.id,
          approvedDate: new Date(),
        };

        if (action === 'approve') {
          const approved = parseFloat(approvedAmount);
          const monthlyDeduction = approved / existingAdvance.repaymentMonths;
          
          updateData = {
            ...updateData,
            status: 'APPROVED' as SalaryAdvanceStatus,
            approvedAmount: approved,
            monthlyDeduction,
            remainingAmount: approved,
          };
        } else {
          updateData = {
            ...updateData,
            status: 'REJECTED' as SalaryAdvanceStatus,
            rejectionReason,
          };
        }

        const updatedAdvance = await prisma.salaryAdvance.update({
          where: { id: advanceId },
          data: updateData,
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        });

        // Create notification for teacher
        const notificationType = action === 'approve' ? 'SALARY_ADVANCE_APPROVED' : 'SALARY_ADVANCE_REPAID';
        const notificationMessage = action === 'approve' 
          ? `Your salary advance request has been approved for ${approvedAmount}. Monthly deduction: ${updateData.monthlyDeduction?.toFixed(2)}`
          : `Your salary advance request has been rejected. Reason: ${rejectionReason}`;

        await prisma.notification.create({
          data: {
            type: notificationType,
            title: `Salary Advance ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            message: notificationMessage,
            senderId: session.user.id,
            receiverId: existingAdvance.teacher.id,
          }
        });

        res.status(200).json(updatedAdvance);
      } catch (error) {
        console.error('Error processing salary advance:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } else if (req.method === 'PUT') {
    // Update advance (mainly for repayment tracking)
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update salary advances' });
    }

    const { id, repaymentAmount } = req.body;

    if (!id || !repaymentAmount) {
      return res.status(400).json({ message: 'Advance ID and repayment amount are required' });
    }

    try {
      // Verify advance belongs to this admin's teacher
      const existingAdvance = await prisma.salaryAdvance.findFirst({
        where: {
          id,
          teacher: {
            adminId: session.user.id
          },
          status: 'APPROVED'
        }
      });

      if (!existingAdvance) {
        return res.status(404).json({ message: 'Advance not found or not eligible for repayment' });
      }

      const newTotalRepaid = existingAdvance.totalRepaid + parseFloat(repaymentAmount);
      const newRemainingAmount = (existingAdvance.approvedAmount || 0) - newTotalRepaid;
      const isFullyRepaid = newRemainingAmount <= 0;

      const updatedAdvance = await prisma.salaryAdvance.update({
        where: { id },
        data: {
          totalRepaid: newTotalRepaid,
          remainingAmount: Math.max(0, newRemainingAmount),
          isFullyRepaid,
          status: isFullyRepaid ? 'REPAID' : 'APPROVED',
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

      // Create notification for teacher if fully repaid
      if (isFullyRepaid) {
        await prisma.notification.create({
          data: {
            type: 'SALARY_ADVANCE_REPAID',
            title: 'Salary Advance Fully Repaid',
            message: `Your salary advance has been fully repaid. Total amount: ${existingAdvance.approvedAmount}`,
            senderId: session.user.id,
            receiverId: existingAdvance.teacherId,
          }
        });
      }

      res.status(200).json(updatedAdvance);
    } catch (error) {
      console.error('Error updating salary advance:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}