import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ message: 'Slug is required' });
  }

  try {
    const globalSettings = await prisma.appSettings.findFirst({
      select: { enableHomePage: true }
    });

    const isGlobalHomepageEnabled = globalSettings ? globalSettings.enableHomePage : true;

    const settings = await prisma.settings.findUnique({
      where: { slug },
      select: {
        appTitle: true,
        headerImg: true,
        headerImgUrl: true,
        tagline: true,
        defaultCurrency: true,
        enableHomePage: true,
      }
    });

    if (!settings) {
      return res.status(404).json({ message: 'Academy not found' });
    }

    const logoUrl = settings.headerImgUrl || settings.headerImg || '/assets/default-logo.png';

    return res.status(200).json({
      appTitle: settings.appTitle,
      headerImg: logoUrl,
      tagline: settings.tagline,
      defaultCurrency: settings.defaultCurrency,
      enableHomePage: isGlobalHomepageEnabled && settings.enableHomePage,
    });
  } catch (error) {
    console.error('Error fetching academy branding:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
