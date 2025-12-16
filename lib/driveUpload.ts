import formidable, { File } from 'formidable';
import fs from 'fs';
import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

export const driveUploadFormConfig = {
  api: { bodyParser: false },
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

export const getDriveAuthUrl = () => {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
  });
};

const ensureSubfolder = async (drive: any, parentId: string | undefined, folderName?: string) => {
  if (!folderName || !parentId) return parentId ? [parentId] : undefined;

  // Try to find existing subfolder under parent
  const list = await drive.files.list({
    q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
  });

  if (list.data.files?.length) {
    return [list.data.files[0].id];
  }

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  return created.data.id ? [created.data.id] : [parentId];
};

export const parseUploadForm = async (req: any, fieldName: string, allowedMimeTypes?: string[]) => {
  const form = formidable({
    maxFileSize: 5 * 1024 * 1024,
    filter: (part) =>
      Boolean(part.mimetype && (!allowedMimeTypes || allowedMimeTypes.includes(part.mimetype))),
  });

  const [fields, files] = await form.parse(req);
  const file = Array.isArray((files as any)[fieldName]) ? (files as any)[fieldName][0] : (files as any)[fieldName];

  if (!file) {
    throw new Error('No file uploaded');
  }

  if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype || '')) {
    throw new Error('Invalid file type');
  }

  return { fields, file };
};

export const uploadFileToDrive = async (
  file: File,
  options: { namePrefix?: string; folderName?: string }
) => {
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.google_drive_refresh_token;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.google_client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_secret;

  if (!clientId || !clientSecret) {
    throw new Error('Cloud storage not configured. Please set Google OAuth client credentials.');
  }

  if (!refreshToken) {
    const authorizeUrl = getDriveAuthUrl();
    const err: any = new Error('Google Drive access not authorized yet.');
    err.authorizeUrl = authorizeUrl;
    throw err;
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const sharedDriveId = process.env.DRIVE_SHARED_ID || process.env.DRIVE_SHARED_DRIVE_ID;
  const baseParent = process.env.DRIVE_FOLDER_ID;
  const parents = await ensureSubfolder(drive, baseParent, options.folderName);

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: `${options.namePrefix || 'file'}-${Date.now()}-${file.originalFilename || 'upload'}`,
      mimeType: file.mimetype || 'application/octet-stream',
      parents,
      ...(sharedDriveId ? { driveId: sharedDriveId } : {}),
    },
    media: {
      mimeType: file.mimetype || 'application/octet-stream',
      body: fs.createReadStream(file.filepath),
    },
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true,
    ...(sharedDriveId ? { supportsTeamDrives: true } : {}),
  });

  const fileId = uploadResponse.data.id;

  if (fileId) {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true,
        ...(sharedDriveId ? { supportsTeamDrives: true } : {}),
      });
    } catch (permErr) {
      console.warn('Failed to set public permission for Drive file', permErr);
    }
  }

  try {
    fs.unlinkSync(file.filepath);
  } catch (cleanupError) {
    console.warn('Failed to cleanup temporary file:', cleanupError);
  }

  const viewUrl = fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : null;
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null;
  // Google hosts public assets on googleusercontent.com; this form works more reliably for images.
  const cdnUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : null;
  return {
    fileId: fileId || null,
    url:
      cdnUrl ||
      viewUrl ||
      downloadUrl ||
      uploadResponse.data.webViewLink ||
      uploadResponse.data.webContentLink ||
      null,
  };
};

const uploadFileToCloudinary = async (file: File, options: { folderName?: string; namePrefix?: string }) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const folder = options.folderName ? options.folderName : 'uploads';
  const uploadResult = await cloudinary.uploader.upload(file.filepath, {
    folder,
    public_id: `${options.namePrefix || 'file'}-${Date.now()}`,
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });

  try {
    fs.unlinkSync(file.filepath);
  } catch (cleanupError) {
    console.warn('Failed to cleanup temporary file:', cleanupError);
  }

  return {
    fileId: uploadResult.public_id || null,
    url: uploadResult.secure_url || uploadResult.url || null,
  };
};

export const uploadFileWithProvider = async (
  file: File,
  provider: 'DRIVE' | 'CLOUDINARY',
  options: { folderName?: string; namePrefix?: string }
) => {
  if (provider === 'CLOUDINARY') {
    return uploadFileToCloudinary(file, options);
  }
  return uploadFileToDrive(file, options);
};
