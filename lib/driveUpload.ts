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
  options: { namePrefix?: string; folderName?: string; driveFolderId?: string | null }
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
  
  let parents;
  if (options.driveFolderId && options.folderName === 'payment-proofs-temp') {
    const mainFolderParents = await ensureSubfolder(drive, baseParent, options.driveFolderId);
    const mainFolderId = mainFolderParents?.[0];
    parents = await ensureSubfolder(drive, mainFolderId, 'payment-proofs-temp');
  } else {
    parents = await ensureSubfolder(drive, baseParent, options.folderName);
  }

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
  options: { folderName?: string; namePrefix?: string; driveFolderId?: string | null }
) => {
  if (provider === 'CLOUDINARY') {
    return uploadFileToCloudinary(file, options);
  }
  return uploadFileToDrive(file, options);
};

export const purgeDriveTemporaryFiles = async (driveFolderId?: string | null) => {
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.google_drive_refresh_token;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.google_client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_secret;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive credentials not fully configured for purging.');
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const sharedDriveId = process.env.DRIVE_SHARED_ID || process.env.DRIVE_SHARED_DRIVE_ID;
  const baseParent = process.env.DRIVE_FOLDER_ID;

  let targetParentId = baseParent;
  if (driveFolderId) {
    const mainFolderParents = await ensureSubfolder(drive, baseParent, driveFolderId);
    targetParentId = mainFolderParents?.[0] || baseParent;
  }

  if (!targetParentId) {
    throw new Error('No target parent folder ID found for Google Drive purge.');
  }

  const folderList = await drive.files.list({
    q: `'${targetParentId}' in parents and name='payment-proofs-temp' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const tempFolderId = folderList.data.files?.[0]?.id;
  if (!tempFolderId) {
    return { deletedCount: 0, message: 'payment-proofs-temp folder does not exist yet.' };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateString = thirtyDaysAgo.toISOString();

  let filesDeleted = 0;
  let pageToken: string | undefined = undefined;

  do {
    const fileList: any = await drive.files.list({
      q: `'${tempFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and createdTime < '${dateString}' and trashed=false`,
      fields: 'nextPageToken, files(id, name, createdTime)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
      pageSize: 100,
    });

    const files = fileList.data.files || [];
    for (const file of files) {
      if (file.id) {
        await drive.files.delete({
          fileId: file.id,
          supportsAllDrives: true,
        });
        filesDeleted++;
      }
    }

    pageToken = fileList.data.nextPageToken;
  } while (pageToken);

  return { deletedCount: filesDeleted, message: `Successfully purged ${filesDeleted} files from Google Drive.` };
};

export const purgeCloudinaryTemporaryFiles = async (cloudinaryFolder?: string | null) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not fully configured for purging.');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const folderPath = cloudinaryFolder ? `${cloudinaryFolder}/payment-proofs-temp` : 'payment-proofs-temp';

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let deletedCount = 0;
  let nextCursor: string | undefined = undefined;

  do {
    const listResponse: any = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 100,
      next_cursor: nextCursor,
    });

    const resources = listResponse.resources || [];
    const publicIdsToDelete = resources
      .filter((res: any) => new Date(res.created_at) < thirtyDaysAgo)
      .map((res: any) => res.public_id);

    if (publicIdsToDelete.length > 0) {
      await cloudinary.api.delete_resources(publicIdsToDelete);
      deletedCount += publicIdsToDelete.length;
    }

    nextCursor = listResponse.next_cursor;
  } while (nextCursor);

  return { deletedCount, message: `Successfully purged ${deletedCount} files from Cloudinary.` };
};

export const purgeTemporaryProofFiles = async (
  provider: 'DRIVE' | 'CLOUDINARY',
  options: { driveFolderId?: string | null; cloudinaryFolder?: string | null }
) => {
  if (provider === 'CLOUDINARY') {
    return purgeCloudinaryTemporaryFiles(options.cloudinaryFolder);
  }
  return purgeDriveTemporaryFiles(options.driveFolderId);
};
