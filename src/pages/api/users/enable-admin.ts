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

  // Only developers can enable/disable admins
  if (session.user.role !== 'DEVELOPER') {
    return res.status(403).json({ message: 'Only developers can enable/disable admins' });
  }

  const { adminId, enable } = req.body;

  if (!adminId || enable === undefined) {
    return res.status(400).json({ message: 'Admin ID and enable status are required' });
  }

  try {
    // Get the admin and their settings
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      include: {
        settings: true,
      }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (enable) {
      // Enabling admin - extend subscription based on type
      const settings = admin.settings;
      if (!settings) {
        return res.status(400).json({ message: 'Admin settings not found' });
      }

      let newEndDate = null;
      const currentDate = new Date();
      
      // Calculate new end date based on subscription type
      if (settings.subscriptionType === 'MONTHLY') {
        newEndDate = new Date(currentDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else if (settings.subscriptionType === 'YEARLY') {
        newEndDate = new Date(currentDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }
      // For LIFETIME, newEndDate remains null

      // Update admin status and subscription
      await prisma.$transaction(async (tx) => {
        // Enable admin and all sub-users
        await tx.user.update({
          where: { id: adminId },
          data: { isActive: true, disabledByDeveloper: false }
        });

        await tx.user.updateMany({
          where: { adminId: adminId },
          data: { isActive: true }
        });

        // Update settings with new subscription end date
        await tx.settings.update({
          where: { adminId: adminId },
          data: {
            subscriptionEndDate: newEndDate,
          }
        });

        // Update or create subscription record
        const existingSubscription = await tx.subscription.findFirst({
          where: { adminId: adminId },
          orderBy: { createdAt: 'desc' }
        });

        if (existingSubscription) {
          await tx.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              status: 'ACTIVE',
              endDate: newEndDate,
            }
          });
        } else {
          await tx.subscription.create({
            data: {
              adminId: adminId,
              plan: settings.subscriptionType,
              amount: settings.subscriptionAmount,
              startDate: currentDate,
              endDate: newEndDate,
              status: 'ACTIVE',
            }
          });
        }

        // Create subscription payment record
        await tx.subscriptionPayment.create({
          data: {
            adminId: adminId,
            amount: settings.subscriptionAmount,
            plan: settings.subscriptionType,
            paymentDate: currentDate,
            expiryExtended: newEndDate || new Date('2099-12-31'), // Far future for lifetime
            processedById: session.user.id,
          }
        });
      });

    } else {
      // Disabling admin manually by developer
      await prisma.$transaction(async (tx) => {
        // Disable admin and all sub-users
        await tx.user.update({
          where: { id: adminId },
          data: { isActive: false, disabledByDeveloper: true }
        });

        await tx.user.updateMany({
          where: { adminId: adminId },
          data: { isActive: false }
        });

        // Update subscription status to expired
        await tx.subscription.updateMany({
          where: { adminId: adminId },
          data: { status: 'EXPIRED' }
        });
      });
    }

    res.status(200).json({ 
      message: `Admin ${enable ? 'enabled' : 'disabled'} successfully`,
      subscriptionExtended: enable
    });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}