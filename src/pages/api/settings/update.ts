import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only developers can update admin settings
  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Only developers can update admin settings' });
  }

  const { 
    adminId, 
    appTitle, 
    headerImg, 
    headerImgUrl,
    tagline, 
    enableHomePage, 
    defaultCurrency,
    subscriptionType,
    subscriptionAmount,
    subscriptionStartDate,
    subscriptionEndDate
  } = req.body;

  if (!adminId) {
    return res.status(400).json({ message: 'Admin ID is required' });
  }

  try {
    // Verify admin exists
    const admin = await prisma.user.findUnique({
      where: { id: adminId, role: 'ADMIN' }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Calculate subscription end date if not provided
    let calculatedEndDate = null;
    if (subscriptionEndDate) {
      calculatedEndDate = new Date(subscriptionEndDate);
    } else if (subscriptionType && subscriptionStartDate) {
      const startDate = new Date(subscriptionStartDate);
      if (subscriptionType === 'MONTHLY') {
        calculatedEndDate = new Date(startDate);
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
      } else if (subscriptionType === 'YEARLY') {
        calculatedEndDate = new Date(startDate);
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
      }
      // For LIFETIME, calculatedEndDate remains null
    }

    await prisma.$transaction(async (tx) => {
      // Update or create settings
      const settingsData = {
        ...(appTitle && { appTitle }),
        ...(headerImg && { headerImg }),
        ...(headerImgUrl && { headerImgUrl }),
        ...(tagline && { tagline }),
        ...(enableHomePage !== undefined && { enableHomePage }),
        ...(defaultCurrency && { defaultCurrency }),
        ...(subscriptionType && { subscriptionType }),
        ...(subscriptionAmount && { subscriptionAmount: parseFloat(subscriptionAmount) }),
        ...(subscriptionStartDate && { subscriptionStartDate: new Date(subscriptionStartDate) }),
        ...(calculatedEndDate !== undefined && { subscriptionEndDate: calculatedEndDate }),
      };

      await tx.settings.upsert({
        where: { adminId },
        update: settingsData,
        create: {
          adminId,
          appTitle: appTitle || 'AIMS',
          headerImg: headerImg || '/assets/default-logo.png',
          headerImgUrl: headerImgUrl || null,
          tagline: tagline || 'Academy Information and Management System',
          enableHomePage: enableHomePage !== undefined ? enableHomePage : true,
          defaultCurrency: defaultCurrency || 'USD',
          subscriptionType: subscriptionType || 'MONTHLY',
          subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount) : 29.99,
          subscriptionStartDate: subscriptionStartDate ? new Date(subscriptionStartDate) : new Date(),
          subscriptionEndDate: calculatedEndDate,
        }
      });

      // Update subscription record if subscription details are provided
      if (subscriptionType || subscriptionAmount || subscriptionStartDate || calculatedEndDate !== undefined) {
        const existingSubscription = await tx.subscription.findFirst({
          where: { adminId },
          orderBy: { createdAt: 'desc' }
        });

        const subscriptionData = {
          plan: subscriptionType || 'MONTHLY',
          amount: subscriptionAmount ? parseFloat(subscriptionAmount) : 29.99,
          startDate: subscriptionStartDate ? new Date(subscriptionStartDate) : new Date(),
          endDate: calculatedEndDate,
          status: 'ACTIVE' as const,
        };

        if (existingSubscription) {
          await tx.subscription.update({
            where: { id: existingSubscription.id },
            data: subscriptionData
          });
        } else {
          await tx.subscription.create({
            data: {
              adminId,
              ...subscriptionData,
            }
          });
        }
      }
    });

    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}