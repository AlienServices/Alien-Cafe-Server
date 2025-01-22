/*
  Warnings:

  - You are about to drop the column `subCategory` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "subCategory",
ADD COLUMN     "subCategories" TEXT[];
