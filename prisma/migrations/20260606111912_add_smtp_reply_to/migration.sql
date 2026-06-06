-- AlterTable
ALTER TABLE "public"."AppSettings" ADD COLUMN     "smtpReplyTo" TEXT;

-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "smtpReplyTo" TEXT;
