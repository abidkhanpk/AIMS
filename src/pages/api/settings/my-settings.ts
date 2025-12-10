import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    let settings;

    if (session.user.role === 'DEVELOPER') {
      // Developer gets global app settings
      let appSettings = await prisma.appSettings.findFirst();
      
      if (!appSettings) {
        // Create default app settings if none exist
        appSettings = await prisma.appSettings.create({
          data: {
            appLogo: '/assets/app-logo.png',
            appName: 'AIMS',
            enableHomePage: true,
          }
        });
      }

      settings = {
        appTitle: appSettings.appName,
        headerImg: appSettings.appLogo,
        headerImgUrl: appSettings.appLogo,
        enableHomePage: appSettings.enableHomePage,
      };
    } else if (session.user.role === 'ADMIN') {
      // Admin gets their own settings
      const adminExists = await prisma.user.findUnique({
        where: { id: session.user.id, role: 'ADMIN' },
        select: { id: true }
      });

      if (!adminExists) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      settings = await prisma.settings.findUnique({
        where: { adminId: session.user.id },
        select: {
          id: true,
          appTitle: true,
          headerImg: true,
          headerImgUrl: true,
          tagline: true,
          enableHomePage: true,
        }
      });

      // If admin doesn't have settings, create default ones
      if (!settings) {
        try {
          settings = await prisma.settings.create({
            data: {
              adminId: session.user.id,
              appTitle: 'AIMS',
              headerImg: '/assets/default-logo.png',
              headerImgUrl: null,
              tagline: 'Academy Information and Management System',
              enableHomePage: true,
            },
            select: {
              id: true,
              appTitle: true,
              headerImg: true,
              headerImgUrl: true,
              tagline: true,
              enableHomePage: true,
            }
          });
        } catch (err: any) {
          // If admin somehow not present (DB out of sync), fall back to defaults instead of crashing
          if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2014')) {
            settings = {
              appTitle: 'AIMS',
              headerImg: '/assets/default-logo.png',
              headerImgUrl: null,
              tagline: 'Academy Information and Management System',
              enableHomePage: true,
            };
          } else {
            throw err;
          }
        }
      }
    } else if (session.user.adminId) {
      // Other users (TEACHER, PARENT, STUDENT) get their admin's settings
      const adminExists = await prisma.user.findUnique({
        where: { id: session.user.adminId },
        select: { id: true },
      });

      if (!adminExists) {
        // If admin is missing, return safe defaults rather than throwing FK errors
        settings = {
          appTitle: 'AIMS',
          headerImg: '/assets/default-logo.png',
          enableHomePage: true,
        };
      } else {
        settings = await prisma.settings.findUnique({
          where: { adminId: session.user.adminId },
          select: {
            id: true,
            appTitle: true,
            headerImg: true,
            headerImgUrl: true,
            tagline: true,
            enableHomePage: true,
          }
        });

        // If admin settings don't exist, create default ones for the admin
        if (!settings) {
          settings = await prisma.settings.create({
            data: {
              adminId: session.user.adminId,
              appTitle: 'AIMS',
              headerImg: '/assets/default-logo.png',
              headerImgUrl: null,
              tagline: 'Academy Information and Management System',
              enableHomePage: true,
            },
            select: {
              id: true,
              appTitle: true,
              headerImg: true,
              headerImgUrl: true,
              tagline: true,
              enableHomePage: true,
            }
          });
        }
      }
    } else {
      // Users without admin - return default settings
      settings = {
        appTitle: 'AIMS',
        headerImg: '/assets/default-logo.png',
        headerImgUrl: null,
        tagline: 'Academy Information and Management System',
        enableHomePage: true,
      };
    }

    // For non-developers, check global homepage setting
    if (session.user.role !== 'DEVELOPER') {
      const appSettings = await prisma.appSettings.findFirst();
      if (appSettings && !appSettings.enableHomePage) {
        settings.enableHomePage = false;
      }
    }

    // Prefer an explicit logo URL if provided and fall back to stored header image
    if (settings?.headerImgUrl) {
      settings.headerImg = settings.headerImgUrl;
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
