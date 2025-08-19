import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only developers and admins can upload logos
    if (!['DEVELOPER', 'ADMIN'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ 
        message: 'Cloud storage not configured. Please set up Cloudinary credentials in environment variables.',
        fallbackMessage: 'For Vercel deployment, file uploads require cloud storage. Please configure Cloudinary or use URL-based logo uploads.'
      });
    }

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      //filter: ({ mimetype }) => {
      //  // Allow only image files
      //  return mimetype && mimetype.includes('image');
      //},
      filter: (part) => {
        
        // Allow only image files
        return Boolean(part.mimetype && part.mimetype.includes('image'));
      },
      
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.logo) ? files.logo[0] : files.logo;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ message: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images only.' });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
      folder: 'aims-logos',
      public_id: `logo-${Date.now()}`,
      transformation: [
        { width: 500, height: 300, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    // Clean up temporary file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary file:', cleanupError);
    }

    res.status(200).json({
      message: 'Logo uploaded successfully',
      logoUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    
    // Provide helpful error messages
    //if (error.message?.includes('Invalid image file')) {
    //  return res.status(400).json({ message: 'Invalid image file. Please upload a valid image.' });
    //}
    // From inside the 'catch' block
    if (error instanceof Error && error.message.includes('Invalid image file')) {
      return res.status(400).json({ message: 'Invalid image file. Please upload a valid image.' });
    }
    
    if (error instanceof Error && error.message.includes('File size too large')) {
      return res.status(400).json({ message: 'File size too large. Please upload images smaller than 5MB.' });
    }

    if (error instanceof Error && error.message.includes('Must supply api_key')) {
      return res.status(500).json({ 
        message: 'Cloud storage configuration error. Please contact administrator.',
        fallbackMessage: 'For Vercel deployment, please use URL-based logo uploads or configure Cloudinary.'
      });
    }

    res.status(500).json({ 
      message: 'Failed to upload logo. Please try again or use URL-based upload.',
      fallbackMessage: 'If you\'re on Vercel, consider using URL-based logo uploads instead.'
    });
  }
}
