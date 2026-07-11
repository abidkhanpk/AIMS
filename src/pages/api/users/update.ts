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
    profession,
    parentCnic,
    bFormNumber,
    dateOfBirthInWords,
    religiousEducation,
    formalEducation,
    previousInstitution,
    previousInstitutionReason,
    admissionClass,
    admissionDepartment,
    fatherAlive,
    motherAlive,
    studentNotes,
    // Teacher specific fields
    qualification,
    payRate,
    payType,
    payCurrency,
    // Admin status update (only for developers)
    isActive,
    isWhatsApp,
    slug
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
    if (isWhatsApp !== undefined) updateData.isWhatsApp = typeof isWhatsApp === 'boolean' ? isWhatsApp : isWhatsApp === 'true';
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (address !== undefined) updateData.address = address;
    if (country !== undefined) updateData.country = country;
    if (existingUser.role === 'PARENT' && profession !== undefined) updateData.profession = profession;

    // Add teacher specific fields ONLY for teachers
    if (existingUser.role === 'TEACHER') {
      if (qualification !== undefined) updateData.qualification = qualification;
      if (payRate !== undefined) updateData.payRate = payRate ? parseFloat(payRate) : null;
      if (payType !== undefined) updateData.payType = payType;
      if (payCurrency !== undefined) updateData.payCurrency = payCurrency;
    }

    // Developers and Admins can update isActive status
    if (isActive !== undefined) {
      if (session.user.role === 'DEVELOPER') {
        updateData.isActive = isActive;
        
        // If disabling an admin, also disable all their sub-users
        if (!isActive && existingUser.role === 'ADMIN') {
          await prisma.user.updateMany({
            where: { adminId: existingUser.id },
            data: { isActive: false }
          });
        }
      } else if (session.user.role === 'ADMIN') {
        // Admins can toggle status of their managed users (TEACHER, STUDENT, PARENT)
        if (['TEACHER', 'STUDENT', 'PARENT'].includes(existingUser.role)) {
          updateData.isActive = isActive;
        } else {
          return res.status(403).json({ message: 'Admins can only toggle status of teachers, students, and parents' });
        }
      }
    }

    if (existingUser.role === 'STUDENT') {
      const studentProfileData = {
        bFormNumber: bFormNumber || null,
        dateOfBirthInWords: dateOfBirthInWords || null,
        religiousEducation: religiousEducation || null,
        formalEducation: formalEducation || null,
        previousInstitution: previousInstitution || null,
        previousInstitutionReason: previousInstitutionReason || null,
        admissionClass: admissionClass || null,
        admissionDepartment: admissionDepartment || null,
        fatherAlive: typeof fatherAlive === 'boolean' ? fatherAlive : null,
        motherAlive: typeof motherAlive === 'boolean' ? motherAlive : null,
        notes: studentNotes || null,
      };

      updateData.studentProfile = {
        upsert: {
          create: studentProfileData,
          update: studentProfileData,
        },
      };
    }

    if (existingUser.role === 'PARENT') {
      updateData.parentProfile = {
        upsert: {
          create: { cnic: parentCnic || null },
          update: { cnic: parentCnic || null },
        },
      };
    }

    // If updating an ADMIN and developer updates them, update their settings slug too
    if (existingUser.role === 'ADMIN' && session.user.role === 'DEVELOPER' && slug !== undefined) {
      let finalSlug = null;
      if (slug === '' || slug === null) {
        finalSlug = null;
      } else {
        finalSlug = slug.trim().toLowerCase();
        const RESERVED_WORDS = new Set([
          'auth', 'dashboard', 'register', 'messages', 'privacy-policy', 'developer',
          '404', 'api', '_next', 'assets', 'icons', 'public', 'sw.js', 'favicon.ico',
          'manifest.json', 'robots.txt'
        ]);
        if (RESERVED_WORDS.has(finalSlug) || !/^[a-z0-9-]+$/.test(finalSlug)) {
          return res.status(400).json({ message: 'Invalid custom link. Use only lowercase letters, numbers, and hyphens. Reserved words are not allowed.' });
        }

        // Check if slug is already taken
        const existingSettings = await prisma.settings.findFirst({
          where: {
            slug: finalSlug,
            NOT: { adminId: id }
          }
        });

        if (existingSettings) {
          return res.status(400).json({ message: 'This custom link is already in use by another academy.' });
        }
      }

      await prisma.settings.upsert({
        where: { adminId: id },
        update: { slug: finalSlug },
        create: {
          adminId: id,
          appTitle: 'AIMS',
          headerImg: '/assets/default-logo.png',
          defaultCurrency: 'PKR',
          slug: finalSlug
        }
      });
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
        isWhatsApp: true,
        dateOfBirth: true,
        address: true,
        country: true,
        qualification: true,
        payRate: true,
        payType: true,
        payCurrency: true,
        profession: true,
        studentProfile: true,
        parentProfile: true,
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
