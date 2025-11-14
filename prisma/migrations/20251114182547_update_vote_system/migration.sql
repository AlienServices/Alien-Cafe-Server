-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "votes" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
-- Add createdAt column as nullable first
ALTER TABLE "votes" ADD COLUMN "createdAt" TIMESTAMP(3);

-- Set createdAt for existing votes to an old date (so they use old vote mapping)
UPDATE "votes" SET "createdAt" = '2025-01-01 00:00:00' WHERE "createdAt" IS NULL;

-- Now make it NOT NULL with default
ALTER TABLE "votes" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "votes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
