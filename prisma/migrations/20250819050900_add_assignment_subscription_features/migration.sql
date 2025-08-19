-- CreateEnum
CREATE TYPE "public"."ClassDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterEnum
ALTER TYPE "public"."SubscriptionPlan" ADD VALUE 'LIFETIME';

-- AlterTable
ALTER TABLE "public"."AppSettings" ADD COLUMN     "lifetimePrice" DOUBLE PRECISION NOT NULL DEFAULT 999.99;

-- AlterTable
ALTER TABLE "public"."Fee" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "month" INTEGER,
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "public"."Salary" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "month" INTEGER,
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "headerImgUrl" TEXT,
ADD COLUMN     "subscriptionAmount" DOUBLE PRECISION NOT NULL DEFAULT 29.99,
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subscriptionType" "public"."SubscriptionPlan" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "public"."Subscription" ALTER COLUMN "endDate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Assignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TEXT,
    "duration" INTEGER,
    "classDays" "public"."ClassDay"[],
    "monthlyFee" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "plan" "public"."SubscriptionPlan" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "expiryExtended" TIMESTAMP(3) NOT NULL,
    "paymentDetails" TEXT,
    "paymentProof" TEXT,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_studentId_courseId_teacherId_key" ON "public"."Assignment"("studentId", "courseId", "teacherId");

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
