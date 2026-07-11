/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Settings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Settings_slug_key" ON "public"."Settings"("slug");
