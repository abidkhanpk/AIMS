import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export type EmailCategory = 'SYSTEM' | 'ACADEMY';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  category: EmailCategory;
  academyAdminId?: string; // Required if category is ACADEMY
}

export async function sendEmail({ to, subject, html, category, academyAdminId }: SendMailOptions) {
  let host, port, user, pass, replyTo, from;

  if (category === 'SYSTEM') {
    const appSettings = await prisma.appSettings.findFirst();
    if (!appSettings || !appSettings.smtpHost || !appSettings.smtpUser || !appSettings.smtpPass) {
      console.warn('Developer SMTP settings are not configured. Email will not be sent.');
      return false;
    }
    host = appSettings.smtpHost;
    port = appSettings.smtpPort ? parseInt(appSettings.smtpPort, 10) : 587;
    user = appSettings.smtpUser;
    pass = appSettings.smtpPass;
    replyTo = appSettings.smtpReplyTo || undefined;
    from = appSettings.smtpFrom || user;
  } else if (category === 'ACADEMY') {
    if (!academyAdminId) {
      throw new Error('academyAdminId is required for ACADEMY category emails');
    }
    const adminSettings = await prisma.settings.findUnique({
      where: { adminId: academyAdminId }
    });
    if (!adminSettings || !adminSettings.smtpHost || !adminSettings.smtpUser || !adminSettings.smtpPass) {
      console.warn(`Admin ${academyAdminId} SMTP settings are not configured. Email will not be sent.`);
      return false;
    }
    host = adminSettings.smtpHost;
    port = adminSettings.smtpPort ? parseInt(adminSettings.smtpPort, 10) : 587;
    user = adminSettings.smtpUser;
    pass = adminSettings.smtpPass;
    replyTo = adminSettings.smtpReplyTo || undefined;
    from = adminSettings.smtpFrom || user;
  } else {
    throw new Error(`Invalid email category: ${category}`);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    console.log(`Message sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
