import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const adminId = session.user.id;

  if (req.method === 'GET') {
    try {
      const tokens = await prisma.registrationToken.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(tokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const { type } = req.body; // 'UNIVERSAL' or 'SINGLE_USE'

    if (!type || !['UNIVERSAL', 'SINGLE_USE'].includes(type)) {
      return res.status(400).json({ message: 'Invalid token type. Must be UNIVERSAL or SINGLE_USE' });
    }

    try {
      // If generating a UNIVERSAL token, deactivate any existing UNIVERSAL tokens first
      if (type === 'UNIVERSAL') {
        await prisma.registrationToken.updateMany({
          where: { adminId, type: 'UNIVERSAL', isActive: true },
          data: { isActive: false },
        });
      }

      // Generate secure random token
      const tokenString = crypto.randomBytes(12).toString('hex'); // 24 character secure string

      const newToken = await prisma.registrationToken.create({
        data: {
          adminId,
          token: tokenString,
          type,
          isActive: true,
        },
      });

      return res.status(201).json(newToken);
    } catch (error) {
      console.error('Error creating token:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Token ID is required' });
    }

    try {
      // Verify token belongs to this admin
      const tokenRecord = await prisma.registrationToken.findFirst({
        where: { id, adminId },
      });

      if (!tokenRecord) {
        return res.status(404).json({ message: 'Token not found or access denied' });
      }

      await prisma.registrationToken.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Link token deleted successfully' });
    } catch (error) {
      console.error('Error deleting token:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
