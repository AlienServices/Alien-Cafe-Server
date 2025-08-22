-- CreateTable
CREATE TABLE "draft_link_previews" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "domain" TEXT,
    "faviconUrl" TEXT,
    "platform" TEXT,
    "author" TEXT,
    "site" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_link_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "draft_link_previews_draftId_url_key" ON "draft_link_previews"("draftId", "url");

-- AddForeignKey
ALTER TABLE "draft_link_previews" ADD CONSTRAINT "draft_link_previews_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
