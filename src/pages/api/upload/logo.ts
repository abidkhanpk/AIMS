import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public/assets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Disable Next.js body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only developers and admins can upload logos
  if (!['DEVELOPER', 'ADMIN'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  if (req.method === 'POST') {
    try {
      await new Promise<void>((resolve, reject) => {
        upload.single('logo')(req as any, res as any, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const logoUrl = `/assets/${file.filename}`;
      
      // Update settings with the new logo URL
      const adminId = session.user.role === 'ADMIN' ? session.user.id : session.user.adminId;
      if (adminId) {
        await prisma.settings.upsert({
          where: { adminId },
          update: { 
            headerImg: logoUrl,
            headerImgUrl: logoUrl // Also update the URL field
          },
          create: {
            adminId,
            headerImg: logoUrl,
            headerImgUrl: logoUrl,
            appTitle: 'AIMS',
          }
        });
      }
      
      res.status(200).json({
        message: 'Logo uploaded successfully',
        logoUrl,
        filename: file.filename
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        message: error.message || 'Error uploading file' 
      });
    }
  } else if (req.method === 'PUT') {
    // Handle URL-based logo update
    const { logoUrl } = req.body;

    if (!logoUrl) {
      return res.status(400).json({ message: 'Logo URL is required' });
    }

    try {
      // Validate URL format (basic validation)
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(logoUrl)) {
        return res.status(400).json({ message: 'Invalid URL format' });
      }

      // Update settings with the new logo URL
      const adminId = session.user.role === 'ADMIN' ? session.user.id : session.user.adminId;
      if (adminId) {
        await prisma.settings.upsert({
          where: { adminId },
          update: { 
            headerImg: logoUrl,
            headerImgUrl: logoUrl
          },
          create: {
            adminId,
            headerImg: logoUrl,
            headerImgUrl: logoUrl,
            appTitle: 'AIMS',
          }
        });
      }

      res.status(200).json({
        message: 'Logo URL updated successfully',
        logoUrl
      });
    } catch (error: any) {
      console.error('URL update error:', error);
      res.status(500).json({ 
        message: error.message || 'Error updating logo URL' 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}