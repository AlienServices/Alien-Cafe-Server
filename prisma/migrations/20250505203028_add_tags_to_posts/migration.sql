-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
