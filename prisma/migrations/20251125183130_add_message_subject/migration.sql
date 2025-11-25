/*
  Warnings:

  - The required column `threadId` was added to the `Message` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "subject" TEXT NOT NULL DEFAULT 'No subject',
ADD COLUMN     "threadId" TEXT NOT NULL;
