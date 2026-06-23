-- CreateTable
CREATE TABLE "VideoTutorial" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleUr" TEXT NOT NULL,
    "keywordsEn" TEXT DEFAULT '',
    "keywordsUr" TEXT DEFAULT '',
    "youtubeUrl" TEXT NOT NULL,
    "roles" "Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTutorial_pkey" PRIMARY KEY ("id")
);
