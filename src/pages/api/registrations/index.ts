import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const adminId = session.user.id;

  if (req.method === 'GET') {
    try {
      const { status } = req.query;
      
      const filter: any = { adminId };
      if (status && typeof status === 'string' && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        filter.status = status;
      }

      const requests = await prisma.registrationRequest.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(requests);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Used for rejecting or modifying details of registration requests
    const { id, status, rejectionReason, parentName, parentEmail, parentMobile, parentCnic, parentProfession, parentRelation, parentAddress, parentCountry, studentsJson } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Registration ID is required' });
    }

    try {
      // Verify registration request belongs to this admin
      const request = await prisma.registrationRequest.findFirst({
        where: { id, adminId },
      });

      if (!request) {
        return res.status(404).json({ message: 'Registration request not found or access denied' });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      if (parentName) updateData.parentName = parentName;
      if (parentEmail) updateData.parentEmail = parentEmail;
      if (parentMobile) updateData.parentMobile = parentMobile;
      if (parentCnic !== undefined) updateData.parentCnic = parentCnic;
      if (parentProfession !== undefined) updateData.parentProfession = parentProfession;
      if (parentRelation) updateData.parentRelation = parentRelation;
      if (parentAddress !== undefined) updateData.parentAddress = parentAddress;
      if (parentCountry !== undefined) updateData.parentCountry = parentCountry;
      if (studentsJson) updateData.studentsJson = studentsJson;

      const updatedRequest = await prisma.registrationRequest.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json(updatedRequest);
    } catch (error) {
      console.error('Error updating registration:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: 'Registration ID is required' });
    }

    try {
      // Verify request belongs to admin
      const request = await prisma.registrationRequest.findFirst({
        where: { id, adminId },
      });

      if (!request) {
        return res.status(404).json({ message: 'Registration request not found' });
      }

      await prisma.registrationRequest.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Registration request deleted successfully' });
    } catch (error) {
      console.error('Error deleting registration:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
