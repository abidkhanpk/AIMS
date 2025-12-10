import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.google_client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_secret;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google/oauth2callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ message: 'Google OAuth client is not configured' });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
  });

  res.status(200).json({ url });
}
