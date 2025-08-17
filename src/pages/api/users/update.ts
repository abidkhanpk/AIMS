import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only admins can update users
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can update users' });
  }

  const { id, name, email, password } = req.body;

  if (!id || !name || !email) {
    return res.status(400).json({ message: 'ID, name, and email are required' });
  }

  try {
    // Verify user belongs to this admin
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        adminId: session.user.id
      }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found or access denied' });
    }

    // Check if email is already taken by another user
    const emailExists = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id }
      }
    });

    if (emailExists) {
      return res.status(400).json({ message: 'Email is already taken' });
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
    };

    // Hash password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}