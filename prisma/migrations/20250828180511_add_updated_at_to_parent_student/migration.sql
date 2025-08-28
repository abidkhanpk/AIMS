/*
  Warnings:

  - Added the required column `updatedAt` to the `ParentStudent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."RelationType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'STEPFATHER', 'STEPMOTHER', 'GRANDFATHER', 'GRANDMOTHER', 'UNCLE', 'AUNT', 'SIBLING', 'COUSIN', 'OTHER');

-- AlterTable
ALTER TABLE "public"."ParentStudent" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "relationType" "public"."RelationType" NOT NULL DEFAULT 'GUARDIAN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;