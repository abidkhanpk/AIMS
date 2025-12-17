-- CreateEnum
CREATE TYPE "public"."StorageProvider" AS ENUM ('DRIVE', 'CLOUDINARY');

-- AlterTable
ALTER TABLE "public"."AppSettings" ADD COLUMN     "cloudinaryFolder" TEXT,
ADD COLUMN     "driveFolderId" TEXT,
ADD COLUMN     "storageProvider" "public"."StorageProvider" NOT NULL DEFAULT 'DRIVE';
