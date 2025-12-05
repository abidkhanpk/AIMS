import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { 
    name, 
    email, 
    password, 
    role, 
    mobile, 
    dateOfBirth, 
    address,
    country,
    // Teacher specific fields
    qualification,
    payRate,
    payType,
    payCurrency,
    // Admin subscription fields
    subscriptionType,
    subscriptionAmount,
    subscriptionStartDate,
    subscriptionEndDate
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Check permissions
  const userRole = session.user.role;
  if (userRole === 'DEVELOPER' && role !== 'ADMIN') {
    return res.status(403).json({ message: 'Developers can only create admins' });
  }
  if (userRole === 'ADMIN' && !['TEACHER', 'PARENT', 'STUDENT'].includes(role)) {
    return res.status(403).json({ message: 'Admins can only create teachers, parents, and students' });
  }
  if (!['DEVELOPER', 'ADMIN'].includes(userRole)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  // Validate date of birth - only for STUDENT and TEACHER
  if (dateOfBirth && !['STUDENT', 'TEACHER'].includes(role)) {
    return res.status(400).json({ message: 'Date of birth is only applicable for students and teachers' });
  }

  // Validate pay-related fields - only for TEACHER
  if ((payRate || payType || payCurrency) && role !== 'TEACHER') {
    return res.status(400).json({ message: 'Pay-related fields are only applicable for teachers' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Determine adminId
    let adminId = null;
    if (role !== 'DEVELOPER') {
      adminId = userRole === 'DEVELOPER' ? null : session.user.id;
      if (userRole === 'ADMIN') {
        adminId = session.user.id;
      }
    }

    // Prepare user data
    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role: role as Role,
      adminId,
    };

    // Add additional fields if provided
    if (mobile) userData.mobile = mobile;
    if (address) userData.address = address;
    if (country) userData.country = country;

    // Add date of birth only for STUDENT and TEACHER
    if (dateOfBirth && ['STUDENT', 'TEACHER'].includes(role)) {
      userData.dateOfBirth = new Date(dateOfBirth);
    }

    // Add teacher specific fields ONLY for teachers
    if (role === 'TEACHER') {
      if (qualification) userData.qualification = qualification;
      if (payRate) userData.payRate = parseFloat(payRate);
      if (payType) userData.payType = payType;
      if (payCurrency) userData.payCurrency = payCurrency;
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
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
        createdAt: true,
      }
    });

    // If creating an admin, also create default settings and subscription
    if (role === 'ADMIN') {
      // Determine subscription details
      let subType = subscriptionType || 'MONTHLY';
      let subAmount = subscriptionAmount || 29.99;
      let subStartDate = subscriptionStartDate ? new Date(subscriptionStartDate) : new Date();
      let subEndDate = null;

      // Calculate end date for non-lifetime subscriptions
      if (subscriptionEndDate) {
        subEndDate = new Date(subscriptionEndDate);
      } else if (subType !== 'LIFETIME') {
        subEndDate = new Date(subStartDate);
        if (subType === 'MONTHLY') {
          subEndDate.setMonth(subEndDate.getMonth() + 1);
        } else if (subType === 'YEARLY') {
          subEndDate.setFullYear(subEndDate.getFullYear() + 1);
        }
      }

      // Create settings with subscription info
      await prisma.settings.create({
        data: {
          adminId: user.id,
          appTitle: 'AIMS',
          headerImg: '/assets/default-logo.png',
          subscriptionType: subType,
          subscriptionAmount: subAmount,
          subscriptionStartDate: subStartDate,
          subscriptionEndDate: subEndDate,
        }
      });

      // Create subscription record
      await prisma.subscription.create({
        data: {
          adminId: user.id,
          plan: subType,
          amount: subAmount,
          startDate: subStartDate,
          endDate: subEndDate,
          status: subEndDate && subEndDate > new Date() ? 'ACTIVE' : 'EXPIRED',
        }
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
