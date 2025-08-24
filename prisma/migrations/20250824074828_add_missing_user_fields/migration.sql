/*
  Warnings:

  - You are about to drop the column `lifetimePrice` on the `AppSettings` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyPrice` on the `AppSettings` table. All the data in the column will be lost.
  - You are about to drop the column `yearlyPrice` on the `AppSettings` table. All the data in the column will be lost.
  - The `payType` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `ParentStudent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PayType" AS ENUM ('DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."FeeType" AS ENUM ('ONCE', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."RelationType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'UNCLE', 'AUNT', 'GRANDFATHER', 'GRANDMOTHER', 'BROTHER', 'SISTER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SalaryAdvanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REPAID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'SALARY_ADVANCE_APPROVED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'SALARY_ADVANCE_REPAID';

-- AlterTable
ALTER TABLE "public"."AppSettings" DROP COLUMN "lifetimePrice",
DROP COLUMN "monthlyPrice",
DROP COLUMN "yearlyPrice";

-- AlterTable
ALTER TABLE "public"."Assignment" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable
ALTER TABLE "public"."Fee" ADD COLUMN     "feeDefinitionId" TEXT;

-- AlterTable
ALTER TABLE "public"."ParentStudent" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relationType" "public"."RelationType" NOT NULL DEFAULT 'GUARDIAN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Salary" ADD COLUMN     "advanceDeduction" DOUBLE PRECISION,
ADD COLUMN     "day" TIMESTAMP(3),
ADD COLUMN     "payType" "public"."PayType" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "week" INTEGER,
ALTER COLUMN "isRecurring" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Subscription" ADD COLUMN     "wasDisabledDueToNonPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wasManuallyDisabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "payCurrency" TEXT,
ADD COLUMN     "profession" TEXT,
DROP COLUMN "payType",
ADD COLUMN     "payType" "public"."PayType";

-- AlterTable
ALTER TABLE "public"."UserSettings" ADD COLUMN     "secretAnswer1" TEXT,
ADD COLUMN     "secretAnswer2" TEXT,
ADD COLUMN     "secretQuestion1" TEXT,
ADD COLUMN     "secretQuestion2" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "public"."FeeDefinition" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "feeType" "public"."FeeType" NOT NULL DEFAULT 'MONTHLY',
    "generationDay" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalaryAdvance" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "repaymentMonths" INTEGER NOT NULL DEFAULT 1,
    "monthlyDeduction" DOUBLE PRECISION,
    "status" "public"."SalaryAdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "totalRepaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION,
    "isFullyRepaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionRenewal" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "plan" "public"."SubscriptionPlan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAmount" DOUBLE PRECISION,
    "paidDate" TIMESTAMP(3),
    "paymentDetails" TEXT,
    "paymentProof" TEXT,
    "processedDate" TIMESTAMP(3),
    "processedById" TEXT,
    "extensionMonths" INTEGER,
    "newExpiryDate" TIMESTAMP(3),
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRenewal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."FeeDefinition" ADD CONSTRAINT "FeeDefinition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeDefinition" ADD CONSTRAINT "FeeDefinition_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Fee" ADD CONSTRAINT "Fee_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Fee" ADD CONSTRAINT "Fee_feeDefinitionId_fkey" FOREIGN KEY ("feeDefinitionId") REFERENCES "public"."FeeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionRenewal" ADD CONSTRAINT "SubscriptionRenewal_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionRenewal" ADD CONSTRAINT "SubscriptionRenewal_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
