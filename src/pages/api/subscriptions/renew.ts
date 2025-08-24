import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let renewals;

      if (session.user.role === 'DEVELOPER') {
        // Developer can see all subscription renewals
        renewals = await prisma.subscriptionRenewal.findMany({
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            processedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (session.user.role === 'ADMIN') {
        // Admin can see their own subscription renewals
        renewals = await prisma.subscriptionRenewal.findMany({
          where: {
            adminId: session.user.id
          },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            processedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.status(200).json(renewals);
    } catch (error) {
      console.error('Error fetching subscription renewals:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const { action, renewalId, plan, amount, currency, paidAmount, paymentDetails, paymentProof } = req.body;

    if (action === 'submit') {
      // Admin submitting renewal payment
      if (session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only admins can submit subscription renewals' });
      }

      if (!plan || !amount || !paidAmount) {
        return res.status(400).json({ message: 'Plan, amount, and paid amount are required' });
      }

      try {
        // Get current subscription
        const currentSubscription = await prisma.subscription.findFirst({
          where: {
            adminId: session.user.id,
            status: {
              in: ['ACTIVE', 'EXPIRED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        const renewal = await prisma.subscriptionRenewal.create({
          data: {
            adminId: session.user.id,
            subscriptionId: currentSubscription?.id,
            plan: plan as SubscriptionPlan,
            amount: parseFloat(amount),
            currency: currency || 'USD',
            paidAmount: parseFloat(paidAmount),
            paidDate: new Date(),
            paymentDetails: paymentDetails || null,
            paymentProof: paymentProof || null,
            status: 'PROCESSING',
          },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        });

        // Create notification for developer
        const developers = await prisma.user.findMany({
          where: { role: 'DEVELOPER' }
        });

        for (const developer of developers) {
          await prisma.notification.create({
            data: {
              type: 'PAYMENT_PROCESSING',
              title: 'Subscription Renewal Submitted',
              message: `${renewal.admin.name} has submitted a ${plan} subscription renewal payment of ${currency || 'USD'} ${paidAmount}. Please review and process.`,
              senderId: session.user.id,
              receiverId: developer.id,
            }
          });
        }

        res.status(201).json(renewal);
      } catch (error) {
        console.error('Error creating subscription renewal:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    } else if (action === 'process') {
      // Developer processing renewal
      if (session.user.role !== 'DEVELOPER') {
        return res.status(403).json({ message: 'Only developers can process subscription renewals' });
      }

      if (!renewalId) {
        return res.status(400).json({ message: 'Renewal ID is required' });
      }

      try {
        // Get the renewal
        const renewal = await prisma.subscriptionRenewal.findFirst({
          where: {
            id: renewalId,
            status: 'PROCESSING'
          },
          include: {
            admin: true
          }
        });

        if (!renewal) {
          return res.status(404).json({ message: 'Renewal not found or already processed' });
        }

        // Calculate extension months based on plan
        let extensionMonths = 0;
        switch (renewal.plan) {
          case 'MONTHLY':
            extensionMonths = 1;
            break;
          case 'YEARLY':
            extensionMonths = 12;
            break;
          case 'LIFETIME':
            extensionMonths = 0; // Lifetime doesn't need extension calculation
            break;
        }

        // Get current subscription
        const currentSubscription = await prisma.subscription.findFirst({
          where: {
            adminId: renewal.adminId,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        let newExpiryDate: Date | null = null;
        
        if (renewal.plan !== 'LIFETIME') {
          // Calculate new expiry date
          const baseDate = currentSubscription?.endDate && currentSubscription.endDate > new Date() 
            ? new Date(currentSubscription.endDate) 
            : new Date();
          
          newExpiryDate = new Date(baseDate);
          newExpiryDate.setMonth(newExpiryDate.getMonth() + extensionMonths);
        }

        // Update the renewal
        const updatedRenewal = await prisma.subscriptionRenewal.update({
          where: { id: renewalId },
          data: {
            status: 'ACTIVE',
            processedById: session.user.id,
            processedDate: new Date(),
            extensionMonths,
            newExpiryDate,
          },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            processedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        });

        // Update or create subscription
        if (currentSubscription) {
          await prisma.subscription.update({
            where: { id: currentSubscription.id },
            data: {
              plan: renewal.plan,
              amount: renewal.amount,
              currency: renewal.currency,
              endDate: newExpiryDate,
              status: 'ACTIVE',
              paidAmount: renewal.paidAmount,
              paidDate: renewal.paidDate,
              paymentDetails: renewal.paymentDetails,
              paymentProof: renewal.paymentProof,
              processedDate: new Date(),
              paidById: renewal.adminId,
            }
          });
        } else {
          await prisma.subscription.create({
            data: {
              adminId: renewal.adminId,
              plan: renewal.plan,
              amount: renewal.amount,
              currency: renewal.currency,
              startDate: new Date(),
              endDate: newExpiryDate,
              status: 'ACTIVE',
              paidAmount: renewal.paidAmount,
              paidDate: renewal.paidDate,
              paymentDetails: renewal.paymentDetails,
              paymentProof: renewal.paymentProof,
              processedDate: new Date(),
              paidById: renewal.adminId,
            }
          });
        }

        // Re-enable admin if they were disabled due to non-payment
        const admin = await prisma.user.findUnique({
          where: { id: renewal.adminId }
        });

        if (admin && !admin.isActive) {
          // Check if admin was disabled due to non-payment (not manually disabled)
          const subscription = await prisma.subscription.findFirst({
            where: { adminId: renewal.adminId },
            orderBy: { createdAt: 'desc' }
          });

          if (subscription && subscription.wasDisabledDueToNonPayment && !subscription.wasManuallyDisabled) {
            await prisma.user.update({
              where: { id: renewal.adminId },
              data: { isActive: true }
            });

            // Update subscription tracking
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { wasDisabledDueToNonPayment: false }
            });
          }
        }

        // Create notification for admin
        await prisma.notification.create({
          data: {
            type: 'PAYMENT_VERIFIED',
            title: 'Subscription Renewed',
            message: `Your ${renewal.plan.toLowerCase()} subscription has been renewed successfully. ${newExpiryDate ? `New expiry date: ${newExpiryDate.toLocaleDateString()}` : 'Lifetime subscription activated.'}`,
            senderId: session.user.id,
            receiverId: renewal.adminId,
          }
        });

        res.status(200).json(updatedRenewal);
      } catch (error) {
        console.error('Error processing subscription renewal:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}