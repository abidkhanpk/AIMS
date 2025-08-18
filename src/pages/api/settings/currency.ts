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
      let defaultCurrency = 'USD';

      if (session.user.role === 'ADMIN') {
        // Get admin's default currency
        const settings = await prisma.settings.findUnique({
          where: { adminId: session.user.id },
          select: { defaultCurrency: true }
        });
        defaultCurrency = settings?.defaultCurrency || 'USD';
      } else if (session.user.adminId) {
        // Get admin's default currency for other users
        const settings = await prisma.settings.findUnique({
          where: { adminId: session.user.adminId },
          select: { defaultCurrency: true }
        });
        defaultCurrency = settings?.defaultCurrency || 'USD';
      }

      res.status(200).json({ defaultCurrency });
    } catch (error) {
      console.error('Error fetching default currency:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Only admins can update their default currency
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update default currency' });
    }

    const { defaultCurrency } = req.body;

    if (!defaultCurrency) {
      return res.status(400).json({ message: 'Default currency is required' });
    }

    try {
      const settings = await prisma.settings.upsert({
        where: { adminId: session.user.id },
        update: { defaultCurrency },
        create: {
          adminId: session.user.id,
          defaultCurrency,
          appTitle: 'AIMS',
          headerImg: '/assets/default-logo.png',
        },
        select: { defaultCurrency: true }
      });

      res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating default currency:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}