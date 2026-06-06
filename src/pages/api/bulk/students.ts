import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ message: 'Unauthorized. Only Admins can import students.' });
  }

  const adminId = session.user.id;

  try {
    const { students } = req.body; // Array of student data parsed from CSV

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'No valid student data provided.' });
    }

    const createdStudents = [];
    const errors = [];

    // Process sequentially or in batches to avoid overwhelming the DB
    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      try {
        if (!row.name || !row.email) {
          errors.push(`Row ${i + 1}: Name and Email are required.`);
          continue;
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email: row.email } });
        if (existing) {
          errors.push(`Row ${i + 1}: Email ${row.email} already exists.`);
          continue;
        }

        const password = row.password || 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            password: hashedPassword,
            role: 'STUDENT',
            adminId,
            mobile: row.mobile || null,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            address: row.address || null,
            country: row.country || null,
          }
        });

        createdStudents.push(newUser);
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${row.email}): ${err.message}`);
      }
    }

    if (createdStudents.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          actionType: 'BULK_IMPORT_STUDENTS',
          details: `Imported ${createdStudents.length} students via CSV. Errors: ${errors.length}`
        }
      });
    }

    return res.status(200).json({ 
      message: `Successfully imported ${createdStudents.length} students.`, 
      successCount: createdStudents.length,
      errors 
    });
  } catch (error) {
    console.error('Error in bulk student import:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
