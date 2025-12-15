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

    // Allow all authenticated roles to upload proofs
    const { folder = 'misc', prefix = 'file' } = (req.query || {}) as { folder?: string; prefix?: string };

    const { file } = await parseUploadForm(req, 'file');
    const uploadResult = await uploadFileToDrive(file, {
      namePrefix: `${prefix}`.toLowerCase(),
      folderName: `${folder}`.toLowerCase(),
    });

    res.status(200).json({
      message: 'File uploaded successfully',
      url: uploadResult.url,
      fileId: uploadResult.fileId,
    });
  } catch (error: any) {
    console.error('File upload error:', error);

    if (error?.authorizeUrl) {
      return res.status(400).json({
        message: 'Google Drive access not authorized yet. Please authorize and set the refresh token.',
        authorizeUrl: error.authorizeUrl || getDriveAuthUrl(),
      });
    }

    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
}
