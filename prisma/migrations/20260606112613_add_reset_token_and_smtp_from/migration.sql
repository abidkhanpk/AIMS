-- AlterTable
ALTER TABLE "public"."AppSettings" ADD COLUMN     "smtpFrom" TEXT;

-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "smtpFrom" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
