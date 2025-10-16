-- AlterTable
ALTER TABLE "link_previews" ADD COLUMN     "author" TEXT,
ADD COLUMN     "embedUrl" TEXT,
ADD COLUMN     "isVideo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "site" TEXT;
