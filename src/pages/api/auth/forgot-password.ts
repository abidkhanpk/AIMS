import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { sendEmail } from '../../../lib/mailer';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, action } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { userSettings: true }
      });

      if (!user) {
        // Return 404 but generic message for security
        return res.status(404).json({ message: 'If this email exists, recovery options will be returned.' });
      }

      const appSettings = await prisma.appSettings.findFirst();
      const hasEmailReset = !!(appSettings && appSettings.smtpHost && appSettings.smtpUser && appSettings.smtpPass);
      const hasSecurityQuestions = !!(user.userSettings && user.userSettings.secretQuestion1 && user.userSettings.secretQuestion2);

      if (action === 'send-code') {
        if (!hasEmailReset) {
          return res.status(400).json({ message: 'Email reset is not configured by the administrator.' });
        }

        // Generate a 6-digit numeric verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash the code to store in db
        const hashedCode = await bcrypt.hash(code, 12);
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        await prisma.user.update({
          where: { email },
          data: {
            resetToken: hashedCode,
            resetTokenExpiry: expiry
          }
        });

        // Send code via email
        const mailSent = await sendEmail({
          to: email,
          subject: 'AIMS Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #4A90E2;">Password Reset Request</h2>
              <p>You are receiving this email because a password reset request was made for your account.</p>
              <p>Please use the following 6-digit verification code to complete your reset:</p>
              <div style="background: #F4F6F8; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; border-radius: 4px; border: 1px solid #E1E4E8;">
                ${code}
              </div>
              <p>This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
            </div>
          `,
          category: 'SYSTEM'
        });

        if (!mailSent) {
          return res.status(500).json({ message: 'Failed to send verification email. Please try again or contact your administrator.' });
        }

        return res.status(200).json({ message: 'Verification code sent to your email.' });
      }

      // Default: Check recovery options
      return res.status(200).json({
        hasSecurityQuestions,
        hasEmailReset,
        question1: user.userSettings?.secretQuestion1 || null,
        question2: user.userSettings?.secretQuestion2 || null
      });
    } catch (error) {
      console.error('Error handling forgot-password request:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    const { email, mode, answer1, answer2, code, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { userSettings: true }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid request' });
      }

      if (mode === 'QUESTIONS') {
        if (!user.userSettings) {
          return res.status(400).json({ message: 'Security questions are not configured.' });
        }
        if (!answer1 || !answer2) {
          return res.status(400).json({ message: 'Both answers are required.' });
        }
        // Case-insensitive comparison and trim
        const isAnswer1Correct = user.userSettings.secretAnswer1?.toLowerCase().trim() === answer1.toLowerCase().trim();
        const isAnswer2Correct = user.userSettings.secretAnswer2?.toLowerCase().trim() === answer2.toLowerCase().trim();

        if (!isAnswer1Correct || !isAnswer2Correct) {
          return res.status(401).json({ message: 'Incorrect answers to security questions' });
        }
      } else if (mode === 'EMAIL') {
        if (!code) {
          return res.status(400).json({ message: 'Verification code is required.' });
        }
        if (!user.resetToken || !user.resetTokenExpiry) {
          return res.status(400).json({ message: 'No verification code was requested or it has expired.' });
        }
        if (new Date() > new Date(user.resetTokenExpiry)) {
          return res.status(400).json({ message: 'Verification code has expired.' });
        }

        const isCodeValid = await bcrypt.compare(code, user.resetToken);
        if (!isCodeValid) {
          return res.status(400).json({ message: 'Invalid verification code.' });
        }
      } else {
        return res.status(400).json({ message: 'Invalid reset mode selected.' });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await prisma.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
