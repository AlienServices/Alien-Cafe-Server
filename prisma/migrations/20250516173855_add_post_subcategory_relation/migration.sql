/*
  Warnings:

  - You are about to drop the column `subCategories` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "subCategories";

-- CreateTable
CREATE TABLE "_PostToSubcategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostToSubcategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PostToSubcategory_B_index" ON "_PostToSubcategory"("B");

-- AddForeignKey
ALTER TABLE "_PostToSubcategory" ADD CONSTRAINT "_PostToSubcategory_A_fkey" FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToSubcategory" ADD CONSTRAINT "_PostToSubcategory_B_fkey" FOREIGN KEY ("B") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
