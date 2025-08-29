-- CreateEnum
CREATE TYPE "public"."FeeType" AS ENUM ('ONCE', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY');

-- AlterTable
ALTER TABLE "public"."ParentStudent" ALTER COLUMN "updatedAt" DROP DEFAULT;
