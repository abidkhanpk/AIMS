-- CreateTable
CREATE TABLE "public"."RegistrationRequest" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "parentMobile" TEXT NOT NULL,
    "parentIsWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "parentCnic" TEXT,
    "parentProfession" TEXT,
    "parentRelation" "public"."RelationType" NOT NULL DEFAULT 'GUARDIAN',
    "parentAddress" TEXT,
    "parentCountry" TEXT,
    "studentsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistrationToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UNIVERSAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationToken_token_key" ON "public"."RegistrationToken"("token");

-- AddForeignKey
ALTER TABLE "public"."RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistrationToken" ADD CONSTRAINT "RegistrationToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
