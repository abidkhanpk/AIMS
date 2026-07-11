import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { adminId } = req.query;

  if (!adminId || typeof adminId !== 'string') {
    return res.status(400).json({ message: 'Admin ID is required' });
  }

  try {
    // Verify admin exists and is actually an ADMIN
    const admin = await prisma.user.findFirst({
      where: { id: adminId, role: 'ADMIN' },
      select: { id: true, name: true }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Academy not found' });
    }

    // Fetch academy settings
    let settings = await prisma.settings.findUnique({
      where: { adminId },
      select: {
        appTitle: true,
        headerImg: true,
        headerImgUrl: true,
        tagline: true,
        defaultCurrency: true,
      }
    });

    // Default settings fallback
    if (!settings) {
      settings = {
        appTitle: 'AIMS Academy',
        headerImg: '/assets/default-logo.png',
        headerImgUrl: null,
        tagline: 'Academy Information and Management System',
        defaultCurrency: 'PKR',
      };
    }

    // Resolve headerImgUrl if present
    const logoUrl = settings.headerImgUrl || settings.headerImg || '/assets/default-logo.png';

    // Fetch active courses of the academy
    const courses = await prisma.course.findMany({
      where: { adminId },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      academyName: settings.appTitle,
      logo: logoUrl,
      tagline: settings.tagline,
      currency: settings.defaultCurrency,
      courses,
    });
  } catch (error) {
    console.error('Error fetching academy info:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
