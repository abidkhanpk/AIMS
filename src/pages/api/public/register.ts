import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const {
    token, // New parameter to track the specific link used
    adminId,
    parentName,
    parentEmail,
    parentMobile,
    parentIsWhatsApp,
    parentCnic,
    parentProfession,
    parentRelation,
    parentAddress,
    parentCountry,
    students,
  } = req.body;

  // Basic validation
  if (!parentName || !parentEmail || !parentMobile || !parentRelation) {
    return res.status(400).json({ message: 'Missing required parent/relative fields' });
  }

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'At least one student must be registered' });
  }

  try {
    let finalAdminId = adminId;

    // 1. Enforce adminId lookup from token to prevent request payload tampering
    if (token) {
      const tokenRecord = await prisma.registrationToken.findUnique({
        where: { token },
      });

      if (!tokenRecord) {
        return res.status(400).json({ message: 'Invalid registration token.' });
      }

      if (!tokenRecord.isActive) {
        return res.status(400).json({ message: 'This registration link has already been used.' });
      }

      // Hard lock the adminId to the token's owner
      finalAdminId = tokenRecord.adminId;
    }

    if (!finalAdminId) {
      return res.status(400).json({ message: 'Academy identifier is missing or invalid.' });
    }

    // Verify admin exists
    const admin = await prisma.user.findFirst({
      where: { id: finalAdminId, role: 'ADMIN' },
    });

    if (!admin) {
      return res.status(404).json({ message: 'Academy not found' });
    }

    // Validate students details
    for (let index = 0; index < students.length; index++) {
      const student = students[index];
      if (!student.name) {
        return res.status(400).json({ message: `Student #${index + 1} is missing a name` });
      }
      if (!student.email) {
        return res.status(400).json({ message: `Student #${index + 1} (${student.name}) is missing an email address` });
      }

      // Check if student email is already in use by an active user
      const existingUser = await prisma.user.findUnique({
        where: { email: student.email }
      });
      if (existingUser) {
        return res.status(400).json({ message: `Email ${student.email} is already in use` });
      }

      if (!student.subjects || !Array.isArray(student.subjects) || student.subjects.length === 0) {
        return res.status(400).json({ message: `Student #${index + 1} (${student.name}) must select at least one course/subject` });
      }
    }

    // Perform database writes in a transaction to guarantee deactivation of single-use token
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the registration request record
      const registrationRequest = await tx.registrationRequest.create({
        data: {
          adminId: finalAdminId,
          parentName,
          parentEmail,
          parentMobile,
          parentIsWhatsApp: !!parentIsWhatsApp,
          parentCnic: parentCnic || null,
          parentProfession: parentProfession || null,
          parentRelation: parentRelation,
          parentAddress: parentAddress || null,
          parentCountry: parentCountry || null,
          studentsJson: students,
        },
      });

      // 2. If the token is SINGLE_USE, deactivate it
      if (token) {
        const tokenRecord = await tx.registrationToken.findUnique({
          where: { token },
        });

        if (tokenRecord && tokenRecord.type === 'SINGLE_USE') {
          await tx.registrationToken.update({
            where: { token },
            data: { isActive: false },
          });
        }
      }

      return registrationRequest;
    });

    return res.status(201).json({
      message: 'Registration request submitted successfully',
      requestId: result.id,
    });
  } catch (error) {
    console.error('Error creating registration request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
