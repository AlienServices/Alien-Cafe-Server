-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "contentHtml" TEXT,
ADD COLUMN     "contentMarkdown" TEXT,
ADD COLUMN     "contentText" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "contentHtml" TEXT,
ADD COLUMN     "contentMarkdown" TEXT,
ADD COLUMN     "contentText" TEXT;
