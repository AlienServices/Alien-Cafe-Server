-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "maybeAction" TEXT,
ADD COLUMN     "noAction" TEXT,
ADD COLUMN     "probablyNoAction" TEXT,
ADD COLUMN     "probablyYesAction" TEXT,
ADD COLUMN     "yesAction" TEXT;
