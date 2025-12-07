import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing code');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.google_client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_secret;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google/oauth2callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).send('Google OAuth client is not configured');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res
        .status(400)
        .send('No refresh token returned. Ensure you used prompt=consent and access_type=offline.');
    }

    // Display refresh token so user can copy to env
    res.status(200).json({
      message: 'Copy this refresh token into GOOGLE_DRIVE_REFRESH_TOKEN (and restart the server)',
      refresh_token: tokens.refresh_token,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('OAuth callback failed');
  }
}
