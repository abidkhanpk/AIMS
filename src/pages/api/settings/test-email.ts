import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Require authenticated user (DEVELOPER or ADMIN)
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { role } = session.user;
  if (role !== 'DEVELOPER' && role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpReplyTo, smtpFrom, testEmail } = req.body;

  if (!smtpHost || !smtpUser || !smtpPass || !testEmail) {
    return res.status(400).json({ message: 'SMTP Host, User, Pass, and Destination Email are required.' });
  }

  const port = smtpPort ? parseInt(smtpPort, 10) : 587;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465 || smtpSecure === 'ssl',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Short timeout to fail fast
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    const fromAddress = smtpFrom || smtpUser;

    let finalFrom = fromAddress;
    if (smtpHost && smtpHost.includes('gmail.com') && fromAddress && !fromAddress.includes('<') && fromAddress !== smtpUser) {
      finalFrom = `"${fromAddress}" <${smtpUser}>`;
    }

    await transporter.sendMail({
      from: finalFrom,
      to: testEmail,
      subject: 'AIMS SMTP Connection Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e1e4e8; border-radius: 6px;">
          <h2 style="color: #2ea44f; border-bottom: 1px solid #e1e4e8; padding-bottom: 10px;">SMTP Test Successful</h2>
          <p>Hello,</p>
          <p>If you are reading this message, your SMTP credentials in <strong>AIMS</strong> are configured correctly.</p>
          <p><strong>Configured Details:</strong></p>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>SMTP Host:</strong> ${smtpHost}</li>
            <li><strong>Port:</strong> ${smtpPort}</li>
            <li><strong>Sender (From):</strong> ${fromAddress}</li>
            <li><strong>Reply-To:</strong> ${smtpReplyTo || 'Not Configured'}</li>
          </ul>
          <p style="color: #586069; font-size: 12px; margin-top: 20px; border-top: 1px solid #e1e4e8; padding-top: 10px;">
            Sent automatically from AIMS (Academy Information and Management System)
          </p>
        </div>
      `,
      ...(smtpReplyTo ? { replyTo: smtpReplyTo } : {}),
    });

    return res.status(200).json({ success: true, message: 'Test email sent successfully!' });
  } catch (error: any) {
    console.error('SMTP test email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'SMTP Connection failed.' 
    });
  }
}
