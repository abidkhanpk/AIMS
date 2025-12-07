import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import { google } from 'googleapis';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

export const config = {
  api: {
    bodyParser: false,
  },
};

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.google_client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_secret;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google/oauth2callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client is not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const getAuthUrl = () => {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
  });
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

    // Ensure Drive is configured
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.google_drive_refresh_token;
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.google_client_id;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_secret;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        message: 'Cloud storage not configured. Please set Google OAuth client credentials in environment variables.',
      });
    }
    if (!refreshToken) {
      return res.status(400).json({
        message: 'Google Drive access not authorized yet. Please authorize and set the refresh token.',
        authorizeUrl: getAuthUrl(),
      });
    }

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      filter: (part) => Boolean(part.mimetype && part.mimetype.includes('image')),
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

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const sharedDriveId = process.env.DRIVE_SHARED_ID || process.env.DRIVE_SHARED_DRIVE_ID;
    const parents = process.env.DRIVE_FOLDER_ID ? [process.env.DRIVE_FOLDER_ID] : undefined;

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: `logo-${Date.now()}-${file.originalFilename || 'upload'}`,
        mimeType: file.mimetype || 'image/png',
        parents,
        ...(sharedDriveId ? { driveId: sharedDriveId } : {}),
      },
      media: {
        mimeType: file.mimetype || 'image/png',
        body: fs.createReadStream(file.filepath),
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true,
      ...(sharedDriveId ? { supportsTeamDrives: true } : {}),
    });

    const fileId = uploadResponse.data.id;

    // Make file accessible via link (viewer)
    if (fileId) {
      try {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
          ...(sharedDriveId ? { supportsTeamDrives: true } : {}),
        });
      } catch (permErr) {
        console.warn('Failed to set public permission for Drive file', permErr);
      }
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary file:', cleanupError);
    }

    const viewUrl = fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : null;

    res.status(200).json({
      message: 'Logo uploaded successfully',
      logoUrl: viewUrl || uploadResponse.data.webViewLink || uploadResponse.data.webContentLink || null,
      fileId,
    });
  } catch (error) {
    console.error('Logo upload error:', error);

    if (error instanceof Error && error.message.includes('Invalid image file')) {
      return res.status(400).json({ message: 'Invalid image file. Please upload a valid image.' });
    }

    if (error instanceof Error && error.message.includes('File size too large')) {
      return res.status(400).json({ message: 'File size too large. Please upload images smaller than 5MB.' });
    }

    const hint = (error as any)?.code === 403
      ? 'Google Drive rejected the upload (often because the service account lacks storage in this drive). Move the target folder to a Shared Drive, add the service account as a member, and set DRIVE_SHARED_ID/DRIVE_SHARED_DRIVE_ID to that drive ID.'
      : undefined;
    res.status(500).json({
      message: 'Failed to upload logo. Please try again or contact administrator.',
      hint,
    });
  }
}
