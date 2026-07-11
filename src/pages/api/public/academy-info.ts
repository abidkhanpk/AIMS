import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Token or Admin ID is required' });
  }

  try {
    let adminId = '';
    let isSingleUse = false;

    // 1. Try to look up the token in the RegistrationToken table
    const tokenRecord = await prisma.registrationToken.findUnique({
      where: { token },
      select: { adminId: true, type: true, isActive: true }
    });

    if (tokenRecord) {
      if (!tokenRecord.isActive) {
        return res.status(400).json({ message: 'This registration link is invalid or has already been used.' });
      }
      adminId = tokenRecord.adminId;
      isSingleUse = tokenRecord.type === 'SINGLE_USE';
    } else {
      // 2. Backwards compatibility: check if the token parameter is a raw adminId
      const adminExists = await prisma.user.findFirst({
        where: { id: token, role: 'ADMIN' },
        select: { id: true }
      });

      if (adminExists) {
        adminId = adminExists.id;
      }
    }

    if (!adminId) {
      return res.status(404).json({ message: 'Academy not found or registration link is invalid.' });
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
      adminId, // Return resolved adminId for form submission
      academyName: settings.appTitle,
      logo: logoUrl,
      tagline: settings.tagline,
      currency: settings.defaultCurrency,
      isSingleUse,
      courses,
    });
  } catch (error) {
    console.error('Error fetching academy info:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
