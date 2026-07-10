-- AlterTable
ALTER TABLE "public"."ParentStudent" ADD COLUMN     "contactForStudentInfo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isWhatsApp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."WhatsAppSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastConnected" TIMESTAMP(3),
    "minDelayMs" INTEGER NOT NULL DEFAULT 5000,
    "maxDelayMs" INTEGER NOT NULL DEFAULT 15000,
    "maxBatchSize" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT,
    "messageType" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_userId_key" ON "public"."WhatsAppSession"("userId");

-- AddForeignKey
ALTER TABLE "public"."WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WhatsAppSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
