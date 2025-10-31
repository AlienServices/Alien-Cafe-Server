-- AlterTable
ALTER TABLE "draft_link_previews" ADD COLUMN     "embedUrl" TEXT,
ADD COLUMN     "isVideo" BOOLEAN NOT NULL DEFAULT false;
