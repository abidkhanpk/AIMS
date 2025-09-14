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

      if (session.user.role === 'ADMIN') {
        const advances = await prisma.salaryAdvance.findMany({
          where: { teacherId, adminId: session.user.id },
          include: { repayments: true },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(advances);
      } else if (session.user.role === 'TEACHER' && session.user.id === teacherId) {
        const advances = await prisma.salaryAdvance.findMany({
          where: { teacherId },
          include: { repayments: true },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(advances);
      }
      return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
      console.error('Error fetching advances:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create advances' });
    }

    const { teacherId, principal, installments, payType, currency, details } = req.body as {
      teacherId: string;
      principal: number;
      installments: number;
      payType?: string;
      currency?: string;
      details?: string;
    };

    if (!teacherId || !principal || !installments) {
      return res.status(400).json({ message: 'teacherId, principal, and installments are required' });
    }

    try {
      // Verify teacher belongs to admin
      const teacher = await prisma.user.findFirst({
        where: { id: teacherId, role: 'TEACHER', adminId: session.user.id }
      });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found or not under your administration' });
      }

      const installmentAmount = parseFloat((principal / installments).toFixed(2));

      const advance = await prisma.salaryAdvance.create({
        data: {
          teacherId,
          adminId: session.user.id,
          principal: parseFloat(String(principal)),
          currency: currency || teacher.payCurrency || 'USD',
          balance: parseFloat(String(principal)),
          installments: parseInt(String(installments), 10),
          installmentAmount,
          payType: (payType as any) || teacher.payType || 'MONTHLY',
          details: details || null,
        }
      });

      // Notify teacher
      await prisma.notification.create({
        data: {
          type: 'PAYMENT_PROCESSING',
          title: 'Salary Advance Issued',
          message: `A salary advance of ${(currency || teacher.payCurrency || 'USD')} ${principal} has been issued. It will be deducted in ${installments} installments.`,
          senderId: session.user.id,
          receiverId: teacherId
        }
      });

      return res.status(201).json(advance);
    } catch (error) {
      console.error('Error creating salary advance:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update advance status (e.g., cancel)
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update advances' });
    }

    const { id, status } = req.body as { id: string; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' };
    if (!id || !status) {
      return res.status(400).json({ message: 'id and status are required' });
    }

    try {
      const advance = await prisma.salaryAdvance.findFirst({ where: { id, adminId: session.user.id } });
      if (!advance) {
        return res.status(404).json({ message: 'Advance not found' });
      }

      const updated = await prisma.salaryAdvance.update({ where: { id }, data: { status } });
      return res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating salary advance:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
