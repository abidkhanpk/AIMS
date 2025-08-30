-- AlterTable
ALTER TABLE "public"."Fee" ADD COLUMN     "feeDefinitionId" TEXT;

-- CreateTable
CREATE TABLE "public"."FeeDefinition" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "type" "public"."FeeType" NOT NULL,
    "generationDay" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentFeeDefinition" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeDefinitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFeeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeDefinition_studentId_feeDefinitionId_key" ON "public"."StudentFeeDefinition"("studentId", "feeDefinitionId");

-- AddForeignKey
ALTER TABLE "public"."Fee" ADD CONSTRAINT "Fee_feeDefinitionId_fkey" FOREIGN KEY ("feeDefinitionId") REFERENCES "public"."FeeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeDefinition" ADD CONSTRAINT "FeeDefinition_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeDefinition" ADD CONSTRAINT "StudentFeeDefinition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeDefinition" ADD CONSTRAINT "StudentFeeDefinition_feeDefinitionId_fkey" FOREIGN KEY ("feeDefinitionId") REFERENCES "public"."FeeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
