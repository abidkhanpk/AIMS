import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../../../lib/mailer';
import { Role, RelationType, ClassDay } from '@prisma/client';

const WA_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';
const WA_SECRET = process.env.WHATSAPP_API_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const adminId = session.user.id;
  const { registrationRequestId, parentPassword, students } = req.body;

  if (!registrationRequestId || !parentPassword || !students || !Array.isArray(students)) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // 1. Fetch registration request
    const request = await prisma.registrationRequest.findFirst({
      where: { id: registrationRequestId, adminId },
    });

    if (!request) {
      return res.status(404).json({ message: 'Registration request not found or access denied' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'This registration request has already been processed' });
    }

    // Fetch academy settings for notification branding
    const settings = await prisma.settings.findUnique({
      where: { adminId },
      select: { appTitle: true, defaultCurrency: true }
    });
    const academyName = settings?.appTitle || 'AIMS Academy';

    // 2. Perform validation checks before executing transaction
    for (const student of students) {
      if (!student.email) {
        return res.status(400).json({ message: `Student ${student.name} is missing an email address` });
      }
      if (!student.password) {
        return res.status(400).json({ message: `Student ${student.name} is missing a password` });
      }

      // Ensure student email is unique
      const studentEmailExists = await prisma.user.findUnique({ where: { email: student.email } });
      if (studentEmailExists) {
        return res.status(400).json({ message: `Student email ${student.email} is already registered` });
      }

      // Validate that each requested course has an assigned teacher
      if (student.subjects && Array.isArray(student.subjects)) {
        for (const sub of student.subjects) {
          if (!sub.teacherId) {
            return res.status(400).json({ message: `Please select a teacher for ${sub.courseName || 'requested course'}` });
          }
        }
      }
    }

    // 3. Database Transaction
    const results = await prisma.$transaction(async (tx) => {
      // Find or create parent account
      let parentUser = await tx.user.findUnique({
        where: { email: request.parentEmail },
      });

      if (!parentUser) {
        const hashedParentPassword = bcrypt.hashSync(parentPassword, 10);
        parentUser = await tx.user.create({
          data: {
            name: request.parentName,
            email: request.parentEmail,
            password: hashedParentPassword,
            role: Role.PARENT,
            adminId,
            mobile: request.parentMobile,
            isWhatsApp: request.parentIsWhatsApp,
            profession: request.parentProfession,
            address: request.parentAddress,
            country: request.parentCountry,
            parentProfile: {
              create: {
                cnic: request.parentCnic,
              },
            },
          },
        });
      }

      const createdStudentsInfo = [];

      // Create each student account, profile, ParentStudent association, and Assignments
      for (const student of students) {
        const hashedStudentPassword = bcrypt.hashSync(student.password, 10);
        const studentUser = await tx.user.create({
          data: {
            name: student.name,
            email: student.email,
            password: hashedStudentPassword,
            role: Role.STUDENT,
            adminId,
            mobile: student.mobile || null,
            isWhatsApp: !!student.isWhatsApp,
            dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
            address: student.address || request.parentAddress || null,
            country: student.country || request.parentCountry || null,
            studentProfile: {
              create: {
                bFormNumber: student.bFormNumber || null,
                dateOfBirthInWords: student.dateOfBirthInWords || null,
                religiousEducation: student.religiousEducation || null,
                formalEducation: student.formalEducation || null,
                previousInstitution: student.previousInstitution || null,
                previousInstitutionReason: student.previousInstitutionReason || null,
                admissionClass: student.admissionClass || null,
                admissionDepartment: student.admissionDepartment || null,
                fatherAlive: student.fatherAlive,
                motherAlive: student.motherAlive,
                notes: student.notes || null,
              },
            },
          },
        });

        // Link Parent & Student
        await tx.parentStudent.create({
          data: {
            parentId: parentUser.id,
            studentId: studentUser.id,
            relationType: request.parentRelation || RelationType.GUARDIAN,
            contactForStudentInfo: true,
          },
        });

        const studentSubjectDetails = [];

        // Create course registrations and scheduled assignments
        if (student.subjects && Array.isArray(student.subjects)) {
          for (const sub of student.subjects) {
            // Create StudentCourse relation
            await tx.studentCourse.create({
              data: {
                studentId: studentUser.id,
                courseId: sub.courseId,
              },
            });

            // Create scheduled Assignment
            const assignment = await tx.assignment.create({
              data: {
                studentId: studentUser.id,
                courseId: sub.courseId,
                teacherId: sub.teacherId,
                assignmentDate: new Date(),
                startTime: sub.startTime || null,
                duration: sub.duration ? parseInt(sub.duration) : null,
                classDays: (sub.classDays || []) as ClassDay[],
                timezone: sub.timezone || 'UTC',
                monthlyFee: sub.monthlyFee ? parseFloat(sub.monthlyFee) : null,
                currency: sub.currency || settings?.defaultCurrency || 'PKR',
                isActive: true,
              },
              include: {
                course: { select: { name: true } },
              },
            });

            studentSubjectDetails.push({
              courseName: assignment.course.name,
              startTime: sub.startTime,
              classDays: sub.classDays || [],
            });

            // Generate first recurring fee invoice if monthly fee > 0 (for next month)
            if (sub.monthlyFee && parseFloat(sub.monthlyFee) > 0) {
              const currentDate = new Date();
              const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
              await tx.fee.create({
                data: {
                  studentId: studentUser.id,
                  courseId: sub.courseId,
                  title: `${assignment.course.name} - Monthly Fee`,
                  description: `Monthly fee for ${assignment.course.name} subject`,
                  amount: parseFloat(sub.monthlyFee),
                  currency: sub.currency || settings?.defaultCurrency || 'PKR',
                  dueDate: nextMonth,
                  month: nextMonth.getMonth() + 1,
                  year: nextMonth.getFullYear(),
                  isRecurring: true,
                },
              });
            }
          }
        }

        createdStudentsInfo.push({
          name: student.name,
          email: student.email,
          password: student.password,
          subjects: studentSubjectDetails,
        });
      }

      // Update registration request status
      const updatedRequest = await tx.registrationRequest.update({
        where: { id: registrationRequestId },
        data: { status: 'APPROVED' },
      });

      return {
        parentName: request.parentName,
        parentEmail: request.parentEmail,
        parentMobile: request.parentMobile,
        parentIsWhatsApp: request.parentIsWhatsApp,
        students: createdStudentsInfo,
        updatedRequest,
      };
    });

    // 4. Construct welcome and notification messages
    const messageLines = [
      `السلام علیکم ورحمۃ اللہ وبرکاتہ\n`,
      `محترم/محترمہ ${results.parentName}،\n`,
      `${academyName} میں خوش آمدید! آپ کے بچوں کے داخلے کی درخواست منظور کر لی گئی ہے۔ اکاؤنٹس کی تفصیلات درج ذیل ہیں:\n`,
      `*والدین کا اکاؤنٹ:*`,
      `لاگ ان لنک: https://aims.absons.net`,
      `یوزر نیم: ${results.parentEmail}`,
      `پاس ورڈ: ${parentPassword}\n`,
      `*بچوں کے اکاؤنٹس:*`,
    ];

    results.students.forEach((std, i) => {
      messageLines.push(`${i + 1}. *${std.name}*`);
      messageLines.push(`   یوزر نیم: ${std.email}`);
      messageLines.push(`   پاس ورڈ: ${std.password}`);
      if (std.subjects && std.subjects.length > 0) {
        messageLines.push(`   کلاسز:`);
        std.subjects.forEach((sub: any) => {
          const daysStr = sub.classDays && sub.classDays.length > 0 ? ` (${sub.classDays.join(', ')})` : '';
          const timeStr = sub.startTime ? ` @ ${sub.startTime}` : '';
          messageLines.push(`   - ${sub.courseName}${daysStr}${timeStr}`);
        });
      }
      messageLines.push('');
    });

    messageLines.push(`براہِ کرم پہلی مرتبہ لاگ اِن کرنے کے فوراً بعد اپنا پاس ورڈ تبدیل کر لیں۔\n`);
    messageLines.push(`جزاکم اللہ خیراً`);

    const welcomeMessageText = messageLines.join('\n');

    // 5. Dispatch notification logic
    let notificationSent = 'MANUAL';

    // 5a. Attempt WhatsApp if configured
    if (results.parentMobile) {
      try {
        const waSession = await prisma.whatsAppSession.findUnique({
          where: { userId: adminId },
        });

        if (waSession && waSession.isConnected) {
          const waRes = await fetch(`${WA_SERVER_URL}/api/message/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-WA-SECRET': WA_SECRET,
            },
            body: JSON.stringify({
              clientId: adminId,
              to: results.parentMobile,
              text: welcomeMessageText,
            }),
          });

          if (waRes.ok) {
            notificationSent = 'WHATSAPP';
            // Log message in DB
            await prisma.whatsAppMessageLog.create({
              data: {
                sessionId: waSession.id,
                recipientPhone: results.parentMobile,
                recipientName: results.parentName,
                messageType: 'WELCOME_PARENT',
                messageText: welcomeMessageText,
                status: 'SENT',
              },
            });
          }
        }
      } catch (waError) {
        console.error('Failed to send welcome message via WhatsApp:', waError);
      }
    }

    // 5b. Attempt Email if SMTP is configured and WhatsApp was not sent
    if (notificationSent === 'MANUAL') {
      try {
        const smtpConfigured = await prisma.settings.findUnique({
          where: { adminId },
          select: { smtpHost: true, smtpUser: true, smtpPass: true }
        });

        if (smtpConfigured && smtpConfigured.smtpHost && smtpConfigured.smtpUser && smtpConfigured.smtpPass) {
          // Format HTML content
          const htmlContent = `
            <h3>Welcome to ${academyName}</h3>
            <p>Dear ${results.parentName},</p>
            <p>Your registration request has been approved. Below are your login credentials to access the portal:</p>
            <h4>Parent Account:</h4>
            <ul>
              <li><strong>Portal Link:</strong> <a href="https://aims.absons.net">https://aims.absons.net</a></li>
              <li><strong>Username / Email:</strong> ${results.parentEmail}</li>
              <li><strong>Password:</strong> ${parentPassword}</li>
            </ul>
            <h4>Student Account(s):</h4>
            ${results.students.map((std, i) => `
              <div style="margin-left: 20px; border-left: 2px solid #ccc; padding-left: 10px; margin-bottom: 10px;">
                <strong>${i + 1}. ${std.name}</strong><br/>
                Username: ${std.email}<br/>
                Password: ${std.password}<br/>
                ${std.subjects && std.subjects.length > 0 ? `
                  Classes:
                  <ul>
                    ${std.subjects.map((sub: any) => `
                      <li>${sub.courseName} ${sub.classDays && sub.classDays.length > 0 ? `(${sub.classDays.join(', ')})` : ''} ${sub.startTime ? `@ ${sub.startTime}` : ''}</li>
                    `).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
            <p>Please log in and update your passwords immediately for security.</p>
            <p>Regards,<br/>${academyName}</p>
          `;

          const emailSent = await sendEmail({
            to: results.parentEmail,
            subject: `Welcome to ${academyName} - Your Account Credentials`,
            html: htmlContent,
            category: 'ACADEMY',
            academyAdminId: adminId,
          });

          if (emailSent) {
            notificationSent = 'EMAIL';
          }
        }
      } catch (emailError) {
        console.error('Failed to send welcome message via Email:', emailError);
      }
    }

    return res.status(200).json({
      message: 'Registration approved successfully',
      notificationSent,
      welcomeMessageText, // Returns password in body so admin can display and copy manually if needed
      students: results.students,
    });
  } catch (error) {
    console.error('Error during registration approval:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
