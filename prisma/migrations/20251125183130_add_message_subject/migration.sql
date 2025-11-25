-- Add nullable columns first for existing rows
ALTER TABLE "public"."Message" ADD COLUMN "subject" TEXT,
ADD COLUMN "threadId" TEXT;

-- Backfill existing rows with defaults
UPDATE "public"."Message" SET "subject" = COALESCE("subject", 'No subject') WHERE "subject" IS NULL;
UPDATE "public"."Message" SET "threadId" = COALESCE("threadId", gen_random_uuid()::text) WHERE "threadId" IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE "public"."Message" ALTER COLUMN "subject" SET NOT NULL;
ALTER TABLE "public"."Message" ALTER COLUMN "threadId" SET NOT NULL;
