-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "searchVector" TEXT;

-- Drop existing index if it exists
DROP INDEX IF EXISTS "posts_searchVector_idx";

-- Create the full-text search index
CREATE INDEX search_vector_idx ON posts USING GIN (to_tsvector('english', COALESCE("searchVector", '')));
