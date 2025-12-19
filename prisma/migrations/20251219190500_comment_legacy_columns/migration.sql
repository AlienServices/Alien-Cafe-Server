-- Legacy compatibility for older server code
-- Re-introduce "date" and "parentId" columns and keep them in sync
-- with the new snake_case columns (created_at, parent_comment_id).

ALTER TABLE "Comment"
  ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Backfill legacy columns from new columns
UPDATE "Comment"
   SET "date" = COALESCE("date", "created_at"),
       "parentId" = COALESCE("parentId", "parent_comment_id");

-- Keep columns in sync going forward
CREATE OR REPLACE FUNCTION comment_legacy_sync() RETURNS trigger AS $$
BEGIN
  -- created_at <-> date
  IF NEW."created_at" IS NULL AND NEW."date" IS NOT NULL THEN
    NEW."created_at" := NEW."date";
  ELSIF NEW."date" IS NULL AND NEW."created_at" IS NOT NULL THEN
    NEW."date" := NEW."created_at";
  END IF;

  -- parent_comment_id <-> parentId
  IF NEW."parent_comment_id" IS NULL AND NEW."parentId" IS NOT NULL THEN
    NEW."parent_comment_id" := NEW."parentId";
  ELSIF NEW."parentId" IS NULL AND NEW."parent_comment_id" IS NOT NULL THEN
    NEW."parentId" := NEW."parent_comment_id";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_legacy_sync_biu ON "Comment";
CREATE TRIGGER comment_legacy_sync_biu
BEFORE INSERT OR UPDATE ON "Comment"
FOR EACH ROW
EXECUTE FUNCTION comment_legacy_sync();
