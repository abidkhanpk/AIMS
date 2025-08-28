import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { RelationType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only admins can manage parent associations
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can manage parent associations' });
  }

  if (req.method === 'GET') {
    const { studentId } = req.query;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    try {
      // Verify student belongs to this admin
      const student = await prisma.user.findFirst({
        where: {
          id: studentId,
          role: 'STUDENT',
          adminId: session.user.id
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found or not under your administration' });
      }

      // Get all parent associations for this student
      const parentAssociations = await prisma.parentStudent.findMany({
        where: { studentId },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profession: true,
              createdAt: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(parentAssociations);
    } catch (error) {
      console.error('Error fetching parent associations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const { studentId, parentId, relationType } = req.body;

    if (!studentId || !parentId || !relationType) {
      return res.status(400).json({ message: 'Student ID, parent ID, and relation type are required' });
    }

    // Validate relation type
    if (!Object.values(RelationType).includes(relationType)) {
      return res.status(400).json({ message: 'Invalid relation type' });
    }

    try {
      // Verify student belongs to this admin
      const student = await prisma.user.findFirst({
        where: {
          id: studentId,
          role: 'STUDENT',
          adminId: session.user.id
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found or not under your administration' });
      }

      // Verify parent belongs to this admin
      const parent = await prisma.user.findFirst({
        where: {
          id: parentId,
          role: 'PARENT',
          adminId: session.user.id
        }
      });

      if (!parent) {
        return res.status(404).json({ message: 'Parent not found or not under your administration' });
      }

      // Check if association already exists
      const existingAssociation = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId
          }
        }
      });

      if (existingAssociation) {
        return res.status(400).json({ message: 'Parent is already associated with this student' });
      }

      // Create the association
      const association = await prisma.parentStudent.create({
        data: {
          parentId,
          studentId,
          relationType: relationType as RelationType,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profession: true,
              createdAt: true,
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      // Create notification for the parent
      await prisma.notification.create({
        data: {
          type: 'SYSTEM_ALERT',
          title: 'Student Association Added',
          message: `You have been associated with student ${student.name} as their ${relationType.toLowerCase().replace('_', ' ')}.`,
          senderId: session.user.id,
          receiverId: parentId,
        }
      });

      res.status(201).json(association);
    } catch (error) {
      console.error('Error creating parent association:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    const { associationId, relationType } = req.body;

    if (!associationId || !relationType) {
      return res.status(400).json({ message: 'Association ID and relation type are required' });
    }

    // Validate relation type
    if (!Object.values(RelationType).includes(relationType)) {
      return res.status(400).json({ message: 'Invalid relation type' });
    }

    try {
      // Verify association exists and belongs to this admin's student
      const existingAssociation = await prisma.parentStudent.findFirst({
        where: {
          id: associationId,
          student: {
            adminId: session.user.id
          }
        },
        include: {
          parent: true,
          student: true
        }
      });

      if (!existingAssociation) {
        return res.status(404).json({ message: 'Association not found or access denied' });
      }

      // Update the association
      const updatedAssociation = await prisma.parentStudent.update({
        where: { id: associationId },
        data: {
          relationType: relationType as RelationType,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profession: true,
              createdAt: true,
            }
          }
        }
      });

      res.status(200).json(updatedAssociation);
    } catch (error) {
      console.error('Error updating parent association:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    const { associationId } = req.body;

    if (!associationId) {
      return res.status(400).json({ message: 'Association ID is required' });
    }

    try {
      // Verify association exists and belongs to this admin's student
      const existingAssociation = await prisma.parentStudent.findFirst({
        where: {
          id: associationId,
          student: {
            adminId: session.user.id
          }
        },
        include: {
          parent: true,
          student: true
        }
      });

      if (!existingAssociation) {
        return res.status(404).json({ message: 'Association not found or access denied' });
      }

      // Delete the association
      await prisma.parentStudent.delete({
        where: { id: associationId }
      });

      // Create notification for the parent
      await prisma.notification.create({
        data: {
          type: 'SYSTEM_ALERT',
          title: 'Student Association Removed',
          message: `Your association with student ${existingAssociation.student.name} has been removed.`,
          senderId: session.user.id,
          receiverId: existingAssociation.parent.id,
        }
      });

      res.status(200).json({ message: 'Association deleted successfully' });
    } catch (error) {
      console.error('Error deleting parent association:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}