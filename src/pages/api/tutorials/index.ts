import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { role: userRole, id: userId } = session.user;

  // Helper function to extract YouTube Video ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // GET: Fetch videos
  if (req.method === 'GET') {
    try {
      let whereClause = {};

      // Regular roles only see videos matching their role
      if (userRole !== 'DEVELOPER' && userRole !== 'ADMIN') {
        whereClause = {
          roles: {
            has: userRole as Role,
          },
        };
      } else {
        // If developer or admin, check if they passed a specific role filter
        const { filterRole } = req.query;
        if (filterRole && Object.values(Role).includes(filterRole as Role)) {
          whereClause = {
            roles: {
              has: filterRole as Role,
            },
          };
        }
      }

      const videos = await prisma.videoTutorial.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(videos);
    } catch (error) {
      console.error('Error fetching video tutorials:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // POST, PUT, DELETE operations require ADMIN or DEVELOPER role
  if (userRole !== 'DEVELOPER' && userRole !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // POST: Create a video tutorial
  if (req.method === 'POST') {
    try {
      const { titleEn, titleUr, keywordsEn, keywordsUr, youtubeUrl, roles } = req.body;

      if (!titleEn || !titleUr || !youtubeUrl || !roles || !Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const youtubeId = getYoutubeId(youtubeUrl);
      if (!youtubeId) {
        return res.status(400).json({ message: 'Invalid YouTube URL' });
      }

      const newVideo = await prisma.videoTutorial.create({
        data: {
          titleEn,
          titleUr,
          keywordsEn: keywordsEn || '',
          keywordsUr: keywordsUr || '',
          youtubeUrl,
          roles: roles as Role[],
        },
      });

      // Log action in AuditLog
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: 'CREATE_VIDEO_TUTORIAL',
          resourceId: newVideo.id,
          details: `Created video tutorial: ${titleEn} (${youtubeId})`,
        },
      });

      return res.status(201).json(newVideo);
    } catch (error) {
      console.error('Error creating video tutorial:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUT: Update an existing video tutorial
  if (req.method === 'PUT') {
    try {
      const { id, titleEn, titleUr, keywordsEn, keywordsUr, youtubeUrl, roles } = req.body;

      if (!id || !titleEn || !titleUr || !youtubeUrl || !roles || !Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const youtubeId = getYoutubeId(youtubeUrl);
      if (!youtubeId) {
        return res.status(400).json({ message: 'Invalid YouTube URL' });
      }

      const updatedVideo = await prisma.videoTutorial.update({
        where: { id },
        data: {
          titleEn,
          titleUr,
          keywordsEn: keywordsEn || '',
          keywordsUr: keywordsUr || '',
          youtubeUrl,
          roles: roles as Role[],
        },
      });

      // Log action in AuditLog
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: 'UPDATE_VIDEO_TUTORIAL',
          resourceId: updatedVideo.id,
          details: `Updated video tutorial: ${titleEn}`,
        },
      });

      return res.status(200).json(updatedVideo);
    } catch (error) {
      console.error('Error updating video tutorial:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // DELETE: Delete a video tutorial
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Missing video ID' });
      }

      const deletedVideo = await prisma.videoTutorial.delete({
        where: { id },
      });

      // Log action in AuditLog
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: 'DELETE_VIDEO_TUTORIAL',
          resourceId: id,
          details: `Deleted video tutorial: ${deletedVideo.titleEn}`,
        },
      });

      return res.status(200).json({ message: 'Video tutorial deleted successfully' });
    } catch (error) {
      console.error('Error deleting video tutorial:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
