import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { 
    id, 
    name, 
    email, 
    password, 
    mobile, 
    dateOfBirth, 
    address,
    country,
    // Teacher specific fields
    qualification,
    payRate,
    payType,
    payCurrency,
    // Admin status update (only for developers)
    isActive
  } = req.body;

  if (!id || !name || !email) {
    return res.status(400).json({ message: 'ID, name, and email are required' });
  }

  try {
    // Check permissions and get existing user
    let existingUser;
    
    if (session.user.role === 'DEVELOPER') {
      // Developers can update any user
      existingUser = await prisma.user.findUnique({
        where: { id }
      });
    } else if (session.user.role === 'ADMIN') {
      // Admins can only update users under their administration
      existingUser = await prisma.user.findFirst({
        where: {
          id,
          adminId: session.user.id
        }
      });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found or access denied' });
    }

    // Validate pay-related fields - only for TEACHER
    if ((payRate !== undefined || payType !== undefined || payCurrency !== undefined) && existingUser.role !== 'TEACHER') {
      return res.status(400).json({ message: 'Pay-related fields are only applicable for teachers' });
    }

    // Check if email is already taken by another user
    const emailExists = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id }
      }
    });

    if (emailExists) {
      return res.status(400).json({ message: 'Email is already taken' });
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
    };

    // Hash password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Add additional fields if provided
    if (mobile !== undefined) updateData.mobile = mobile;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (address !== undefined) updateData.address = address;
    if (country !== undefined) updateData.country = country;

    // Add teacher specific fields ONLY for teachers
    if (existingUser.role === 'TEACHER') {
      if (qualification !== undefined) updateData.qualification = qualification;
      if (payRate !== undefined) updateData.payRate = payRate ? parseFloat(payRate) : null;
      if (payType !== undefined) updateData.payType = payType;
      if (payCurrency !== undefined) updateData.payCurrency = payCurrency;
    }

    // Only developers can update isActive status
    if (session.user.role === 'DEVELOPER' && isActive !== undefined) {
      updateData.isActive = isActive;
      
      // If disabling an admin, also disable all their sub-users
      if (!isActive && existingUser.role === 'ADMIN') {
        await prisma.user.updateMany({
          where: { adminId: existingUser.id },
          data: { isActive: false }
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobile: true,
        dateOfBirth: true,
        address: true,
        country: true,
        qualification: true,
        payRate: true,
        payType: true,
        payCurrency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
