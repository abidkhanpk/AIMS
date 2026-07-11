import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const {
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
  if (!adminId || !parentName || !parentEmail || !parentMobile || !parentRelation) {
    return res.status(400).json({ message: 'Missing required parent/relative fields' });
  }

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'At least one student must be registered' });
  }

  try {
    // Verify admin exists
    const admin = await prisma.user.findFirst({
      where: { id: adminId, role: 'ADMIN' },
    });

    if (!admin) {
      return res.status(404).json({ message: 'Academy not found' });
    }

    // Validate students details
    for (const [index, student] of students.entries()) {
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

    // Create the registration request record
    const registrationRequest = await prisma.registrationRequest.create({
      data: {
        adminId,
        parentName,
        parentEmail,
        parentMobile,
        parentIsWhatsApp: !!parentIsWhatsApp,
        parentCnic: parentCnic || null,
        parentProfession: parentProfession || null,
        parentRelation: parentRelation,
        parentAddress: parentAddress || null,
        parentCountry: parentCountry || null,
        studentsJson: students, // Storing students payload as JSON
      },
    });

    return res.status(201).json({
      message: 'Registration request submitted successfully',
      requestId: registrationRequest.id,
    });
  } catch (error) {
    console.error('Error creating registration request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
