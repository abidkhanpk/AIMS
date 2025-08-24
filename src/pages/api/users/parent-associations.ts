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

  if (req.method === 'GET') {
    const { studentId } = req.query;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    try {
      // Only admins can view parent associations
      if (session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only admins can view parent associations' });
      }

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

      const associations = await prisma.parentStudent.findMany({
        where: { studentId },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profession: true,
            }
          }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      res.status(200).json(associations);
    } catch (error) {
      console.error('Error fetching parent associations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Only admins can create parent associations
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create parent associations' });
    }

    const { studentId, parentId, relationType, isPrimary } = req.body;

    if (!studentId || !parentId || !relationType) {
      return res.status(400).json({ message: 'Student ID, parent ID, and relation type are required' });
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
        return res.status(400).json({ message: 'Parent-student association already exists' });
      }

      // If this is set as primary, remove primary status from other associations
      if (isPrimary) {
        await prisma.parentStudent.updateMany({
          where: { studentId },
          data: { isPrimary: false }
        });
      }

      const association = await prisma.parentStudent.create({
        data: {
          studentId,
          parentId,
          relationType: relationType as RelationType,
          isPrimary: isPrimary || false,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profession: true,
            }
          }
        }
      });

      res.status(201).json(association);
    } catch (error) {
      console.error('Error creating parent association:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Only admins can update parent associations
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update parent associations' });
    }

    const { id, relationType, isPrimary } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Association ID is required' });
    }

    try {
      // Verify association exists and belongs to this admin's student
      const existingAssociation = await prisma.parentStudent.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingAssociation) {
        return res.status(404).json({ message: 'Association not found or access denied' });
      }

      // If this is set as primary, remove primary status from other associations
      if (isPrimary) {
        await prisma.parentStudent.updateMany({
          where: { 
            studentId: existingAssociation.studentId,
            id: { not: id }
          },
          data: { isPrimary: false }
        });
      }

      const updatedAssociation = await prisma.parentStudent.update({
        where: { id },
        data: {
          ...(relationType && { relationType: relationType as RelationType }),
          ...(isPrimary !== undefined && { isPrimary }),
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profession: true,
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
    // Only admins can delete parent associations
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete parent associations' });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Association ID is required' });
    }

    try {
      // Verify association exists and belongs to this admin's student
      const existingAssociation = await prisma.parentStudent.findFirst({
        where: {
          id,
          student: {
            adminId: session.user.id
          }
        }
      });

      if (!existingAssociation) {
        return res.status(404).json({ message: 'Association not found or access denied' });
      }

      await prisma.parentStudent.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Parent association deleted successfully' });
    } catch (error) {
      console.error('Error deleting parent association:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}