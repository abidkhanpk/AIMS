import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { newEmail } = req.body;

  if (!newEmail) {
    return res.status(400).json({ message: 'New email is required' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: newEmail,
        id: { not: session.user.id }
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already taken' });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: newEmail }
    });

    res.status(200).json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
