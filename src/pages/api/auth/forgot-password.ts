import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Step 1: Request security questions
    const { email } = req.body;

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
        return res.status(404).json({ message: 'If this email exists, security questions will be returned.' });
      }

      if (!user.userSettings || !user.userSettings.secretQuestion1 || !user.userSettings.secretQuestion2) {
        return res.status(400).json({ message: 'Security questions are not set up for this account. Please contact your administrator.' });
      }

      return res.status(200).json({
        question1: user.userSettings.secretQuestion1,
        question2: user.userSettings.secretQuestion2
      });
    } catch (error) {
      console.error('Error fetching security questions:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Step 2: Verify answers and reset password
    const { email, answer1, answer2, newPassword } = req.body;

    if (!email || !answer1 || !answer2 || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { userSettings: true }
      });

      if (!user || !user.userSettings) {
        return res.status(400).json({ message: 'Invalid request' });
      }

      // Case-insensitive comparison and trim
      const isAnswer1Correct = user.userSettings.secretAnswer1?.toLowerCase().trim() === answer1.toLowerCase().trim();
      const isAnswer2Correct = user.userSettings.secretAnswer2?.toLowerCase().trim() === answer2.toLowerCase().trim();

      if (!isAnswer1Correct || !isAnswer2Correct) {
        return res.status(401).json({ message: 'Incorrect answers to security questions' });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
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
