/*
  Warnings:

  - You are about to drop the column `collaborators` on the `Draft` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Draft" DROP COLUMN "collaborators";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasNewDrafts" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DraftCollaborator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftCollaborator_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DraftCollaborator" ADD CONSTRAINT "DraftCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCollaborator" ADD CONSTRAINT "DraftCollaborator_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
