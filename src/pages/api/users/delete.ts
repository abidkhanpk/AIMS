import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.body as { id?: string };
  if (!id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: {
      id: true, role: true, adminId: true
    }});

    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requesterRole = session.user.role as Role;

    // Permissions:
    // - DEVELOPER can delete any user (incl. ADMIN)
    // - ADMIN can delete only their own TEACHER, PARENT, STUDENT users
    if (requesterRole === 'ADMIN') {
      if (!['TEACHER', 'PARENT', 'STUDENT'].includes(target.role)) {
        return res.status(403).json({ message: 'Admins can only delete teachers, parents, and students' });
      }
      if (target.adminId !== session.user.id) {
        return res.status(403).json({ message: 'Access denied: user not under this admin' });
      }
    } else if (requesterRole !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await prisma.$transaction(async (tx) => {
      // Helper: delete ParentRemarks for a set of progress IDs
      const deleteParentRemarksForProgressIds = async (progressIds: string[]) => {
        if (progressIds.length > 0) {
          await tx.parentRemark.deleteMany({ where: { progressId: { in: progressIds } } });
        }
      };

      // Cascade deletion for STUDENT
      const deleteStudent = async (studentId: string) => {
        // Parent/Teacher relations
        await tx.parentStudent.deleteMany({ where: { studentId } });
        await tx.teacherStudent.deleteMany({ where: { studentId } });
        await tx.studentCourse.deleteMany({ where: { studentId } });
        // Assignments
        await tx.assignment.deleteMany({ where: { studentId } });
        await tx.testRecord.deleteMany({ where: { studentId } });
        // Fees and fee definitions links
        await tx.fee.deleteMany({ where: { studentId } });
        await tx.studentFeeDefinition.deleteMany({ where: { studentId } });
        // Progress + remarks
        const studentProgress = await tx.progress.findMany({ where: { studentId }, select: { id: true } });
        await deleteParentRemarksForProgressIds(studentProgress.map(p => p.id));
        await tx.progress.deleteMany({ where: { studentId } });
        // Notifications and settings
        await tx.notification.deleteMany({ where: { OR: [{ senderId: studentId }, { receiverId: studentId }] } });
        await tx.userSettings.deleteMany({ where: { userId: studentId } });
        // Finally delete user
        await tx.user.delete({ where: { id: studentId } });
      };

      // Cascade deletion for TEACHER
      const deleteTeacher = async (teacherId: string) => {
        await tx.teacherStudent.deleteMany({ where: { teacherId } });
        await tx.assignment.deleteMany({ where: { teacherId } });
        await tx.testRecord.deleteMany({ where: { teacherId } });
        await tx.examTemplate.deleteMany({ where: { createdById: teacherId } });
        // Salaries & payments
        const advances = await tx.salaryAdvance.findMany({ where: { teacherId }, select: { id: true } });
        const advanceIds = advances.map(a => a.id);
        if (advanceIds.length > 0) {
          await tx.salaryAdvanceRepayment.deleteMany({ where: { advanceId: { in: advanceIds } } });
          await tx.salaryAdvance.deleteMany({ where: { id: { in: advanceIds } } });
        }
        await tx.salaryPayment.deleteMany({ where: { teacherId } });
        await tx.salary.deleteMany({ where: { teacherId } });
        // Progress + remarks
        const teacherProgress = await tx.progress.findMany({ where: { teacherId }, select: { id: true } });
        await deleteParentRemarksForProgressIds(teacherProgress.map(p => p.id));
        await tx.progress.deleteMany({ where: { teacherId } });
        // Notifications and settings
        await tx.notification.deleteMany({ where: { OR: [{ senderId: teacherId }, { receiverId: teacherId }] } });
        await tx.userSettings.deleteMany({ where: { userId: teacherId } });
        // Finally delete user
        await tx.user.delete({ where: { id: teacherId } });
      };

      // Cascade deletion for PARENT
      const deleteParent = async (parentId: string) => {
        await tx.parentStudent.deleteMany({ where: { parentId } });
        await tx.parentRemark.deleteMany({ where: { parentId } });
        // Nullify fee paidBy references by this parent
        await tx.fee.updateMany({ where: { paidById: parentId }, data: { paidById: null } });
        // Notifications and settings
        await tx.notification.deleteMany({ where: { OR: [{ senderId: parentId }, { receiverId: parentId }] } });
        await tx.userSettings.deleteMany({ where: { userId: parentId } });
        // Finally delete user
        await tx.user.delete({ where: { id: parentId } });
      };

      // Cascade deletion for ADMIN
      const deleteAdmin = async (adminId: string) => {
        // Delete managed users first (students, teachers, parents)
        const managedUsers = await tx.user.findMany({ where: { adminId }, select: { id: true, role: true } });
        for (const u of managedUsers) {
          if (u.role === 'STUDENT') {
            await deleteStudent(u.id);
          } else if (u.role === 'TEACHER') {
            await deleteTeacher(u.id);
          } else if (u.role === 'PARENT') {
            await deleteParent(u.id);
          } else {
            // Skip other roles
          }
        }

        // Courses and their dependent data
        const courses = await tx.course.findMany({ where: { adminId }, select: { id: true } });
        const courseIds = courses.map(c => c.id);
        if (courseIds.length > 0) {
          await tx.assignment.deleteMany({ where: { courseId: { in: courseIds } } });
          await tx.fee.deleteMany({ where: { courseId: { in: courseIds } } });
          await tx.testRecord.deleteMany({ where: { courseId: { in: courseIds } } });
          await tx.examTemplate.deleteMany({ where: { courseId: { in: courseIds } } });
          const courseProgress = await tx.progress.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } });
          await deleteParentRemarksForProgressIds(courseProgress.map(p => p.id));
          await tx.progress.deleteMany({ where: { courseId: { in: courseIds } } });
          await tx.studentCourse.deleteMany({ where: { courseId: { in: courseIds } } });
          await tx.course.deleteMany({ where: { id: { in: courseIds } } });
        }

        // Fee definitions and student fee defs (if any remain)
        const feeDefs = await tx.feeDefinition.findMany({ where: { adminId }, select: { id: true } });
        const feeDefIds = feeDefs.map(fd => fd.id);
        if (feeDefIds.length > 0) {
          await tx.studentFeeDefinition.deleteMany({ where: { feeDefinitionId: { in: feeDefIds } } });
          await tx.feeDefinition.deleteMany({ where: { id: { in: feeDefIds } } });
        }

        // Subscriptions and payments
        await tx.subscriptionPayment.deleteMany({ where: { adminId } });
        await tx.subscription.deleteMany({ where: { adminId } });

        // Settings and notifications
        await tx.settings.deleteMany({ where: { adminId } });
        await tx.notification.deleteMany({ where: { OR: [{ senderId: adminId }, { receiverId: adminId }] } });
        await tx.userSettings.deleteMany({ where: { userId: adminId } });
        await tx.examTemplate.deleteMany({ where: { adminId } });

        // Finally delete admin
        await tx.user.delete({ where: { id: adminId } });
      };

      // Dispatch by role
      if (target.role === 'STUDENT') {
        await deleteStudent(target.id);
      } else if (target.role === 'TEACHER') {
        await deleteTeacher(target.id);
      } else if (target.role === 'PARENT') {
        await deleteParent(target.id);
      } else if (target.role === 'ADMIN') {
        if (requesterRole !== 'DEVELOPER') {
          throw new Error('Only developers can delete admin accounts');
        }
        await deleteAdmin(target.id);
      } else if (target.role === 'DEVELOPER') {
        if (requesterRole !== 'DEVELOPER') {
          throw new Error('Cannot delete developer accounts');
        }
        // Developers deleting developers is disallowed for safety
        throw new Error('Deleting developer accounts is not allowed');
      } else {
        // Unknown role fallback
        await tx.user.delete({ where: { id: target.id } });
      }
    });

    return res.status(200).json({ message: 'User and related records deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: error?.message || 'Internal server error' });
  }
}
