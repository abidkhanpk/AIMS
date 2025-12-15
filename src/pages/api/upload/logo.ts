import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { driveUploadFormConfig, getDriveAuthUrl, parseUploadForm, uploadFileToDrive } from '../../../../lib/driveUpload';

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

    // Ensure Drive is configured
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const { file } = await parseUploadForm(req, 'logo', allowedTypes);
    const uploadResult = await uploadFileToDrive(file, { namePrefix: 'logo' });

    res.status(200).json({
      message: 'Logo uploaded successfully',
      logoUrl: uploadResult.url,
      fileId: uploadResult.fileId,
    });
  } catch (error) {
    console.error('Logo upload error:', error);

    const hint = (error as any)?.code === 403
      ? 'Google Drive rejected the upload (often because the service account lacks storage in this drive). Move the target folder to a Shared Drive, add the service account as a member, and set DRIVE_SHARED_ID/DRIVE_SHARED_DRIVE_ID to that drive ID.'
      : undefined;
    res.status(500).json({
      message:
        error instanceof Error ? error.message : 'Failed to upload logo. Please try again or contact administrator.',
      hint,
    });
  }
}
