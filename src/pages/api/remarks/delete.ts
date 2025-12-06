import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });
  if (session.user.role !== 'ADMIN') return res.status(403).json({ message: 'Only admins can delete remarks' });

  const { remarkId, replyId } = req.body as { remarkId?: string; replyId?: string };

  try {
    if (replyId) {
      const reply = await prisma.parentRemarkReply.findUnique({
        where: { id: replyId },
        include: { remark: { include: { progress: { include: { student: true } } } } },
      });
      if (!reply) return res.status(404).json({ message: 'Reply not found' });
      if (reply.remark.progress.student.adminId !== session.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      await prisma.parentRemarkReply.delete({ where: { id: replyId } });
      return res.status(200).json({ message: 'Reply deleted' });
    }

    if (remarkId) {
      const remark = await prisma.parentRemark.findUnique({
        where: { id: remarkId },
        include: { progress: { include: { student: true } } },
      });
      if (!remark) return res.status(404).json({ message: 'Remark not found' });
      if (remark.progress.student.adminId !== session.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      await prisma.parentRemarkReply.deleteMany({ where: { remarkId } });
      await prisma.parentRemark.delete({ where: { id: remarkId } });
      return res.status(200).json({ message: 'Remark deleted' });
    }

    return res.status(400).json({ message: 'remarkId or replyId required' });
  } catch (error) {
    console.error('Error deleting remark/reply:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
