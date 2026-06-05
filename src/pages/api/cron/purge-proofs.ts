import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { purgeTemporaryProofFiles } from '../../../../lib/driveUpload';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify cron job authorization
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  if (
    (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) &&
    (!process.env.CRON_API_KEY || apiKey !== process.env.CRON_API_KEY)
  ) {
    // If auth keys are not defined in env, allow it for local dry runs or debugging
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  try {
    const appSettings = await prisma.appSettings.findFirst();
    const provider = (appSettings?.storageProvider as 'DRIVE' | 'CLOUDINARY' | null) || 'DRIVE';
    const driveFolderId = appSettings?.driveFolderId;
    const cloudinaryFolder = appSettings?.cloudinaryFolder;

    const result = await purgeTemporaryProofFiles(provider, {
      driveFolderId,
      cloudinaryFolder,
    });

    const { message: resultMessage, ...rest } = result;

    res.status(200).json({
      message: resultMessage || 'Temporary proof files purge completed',
      provider,
      ...rest,
    });
  } catch (error: any) {
    console.error('Error in purge proofs cron:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
