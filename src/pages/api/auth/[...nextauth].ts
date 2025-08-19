import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              name: true,
              email: true,
              password: true,
              role: true,
              adminId: true,
              isActive: true,
            }
          });

          if (!user) {
            return null;
          }

          // Check if user account is active
          if (!user.isActive) {
            throw new Error('Account disabled');
          }

          // Check subscription status for admins and their users
          if (user.role === 'ADMIN') {
            // Check admin's own subscription
            const subscription = await prisma.subscription.findFirst({
              where: {
                adminId: user.id,
                status: 'ACTIVE'
              },
              orderBy: {
                createdAt: 'desc'
              }
            });

            // Check if subscription is expired (except lifetime)
            if (subscription && subscription.endDate && subscription.endDate < new Date()) {
              // Mark subscription as expired
              await prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: 'EXPIRED' }
              });

              // Disable admin account
              await prisma.user.update({
                where: { id: user.id },
                data: { isActive: false }
              });

              throw new Error('Subscription expired');
            }

            if (!subscription || (subscription.endDate && subscription.endDate < new Date())) {
              throw new Error('Subscription expired');
            }
          } else if (user.role !== 'DEVELOPER' && user.adminId) {
            // Check if admin is active and has valid subscription
            const admin = await prisma.user.findUnique({
              where: { id: user.adminId },
              select: { 
                isActive: true,
                subscriptions: {
                  where: {
                    status: 'ACTIVE'
                  },
                  orderBy: {
                    createdAt: 'desc'
                  },
                  take: 1
                }
              }
            });

            if (!admin?.isActive) {
              throw new Error('Account disabled - Admin subscription expired');
            }

            // Check admin's subscription
            const adminSubscription = admin.subscriptions[0];
            if (adminSubscription && adminSubscription.endDate && adminSubscription.endDate < new Date()) {
              // Mark admin subscription as expired and disable admin
              await prisma.subscription.update({
                where: { id: adminSubscription.id },
                data: { status: 'EXPIRED' }
              });

              await prisma.user.update({
                where: { id: user.adminId },
                data: { isActive: false }
              });

              throw new Error('Account disabled - Admin subscription expired');
            }

            if (!adminSubscription || (adminSubscription.endDate && adminSubscription.endDate < new Date())) {
              throw new Error('Account disabled - Admin subscription expired');
            }
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            adminId: user.adminId,
          };
        } catch (error) {
          console.error('Auth error:', error);
          if (error instanceof Error && (
            error.message === 'Account disabled' || 
            error.message === 'Subscription expired' ||
            error.message === 'Account disabled - Admin subscription expired'
          )) {
            throw error;
          }
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.adminId = user.adminId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as Role;
        session.user.adminId = token.adminId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

export default NextAuth(authOptions);