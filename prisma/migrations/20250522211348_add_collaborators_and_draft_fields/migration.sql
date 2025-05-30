-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subcategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "collaborators" TEXT[] DEFAULT ARRAY[]::TEXT[];
