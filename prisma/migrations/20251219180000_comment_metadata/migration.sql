-- Comment metadata + snake_case columns
-- - Renames: date -> created_at, parentId -> parent_comment_id
-- - Adds: updated_at (required), edited_at, deleted_at
-- - Rebuilds self-referential FK and adds helpful indexes

-- Drop old self-referential FK (it references parentId)
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_parentId_fkey";

-- Rename columns to match new mappings
ALTER TABLE "Comment" RENAME COLUMN "date" TO "created_at";
ALTER TABLE "Comment" RENAME COLUMN "parentId" TO "parent_comment_id";

-- Add new metadata columns
ALTER TABLE "Comment"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "edited_at" TIMESTAMP(3),
  ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Backfill updated_at to match created_at for existing rows
UPDATE "Comment" SET "updated_at" = "created_at";

-- Re-create self-referential FK using the new column name
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_parent_comment_id_fkey"
  FOREIGN KEY ("parent_comment_id")
  REFERENCES "Comment"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Indexes for common comment queries
CREATE INDEX IF NOT EXISTS "Comment_postId_created_at_idx" ON "Comment"("postId", "created_at");
CREATE INDEX IF NOT EXISTS "Comment_parent_comment_id_created_at_idx" ON "Comment"("parent_comment_id", "created_at");
