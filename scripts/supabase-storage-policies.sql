-- Enable Row Level Security on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to postmedia bucket
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'postmedia' AND 
  auth.role() = 'authenticated'
);

-- Policy to allow public read access to postmedia bucket
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'postmedia');

-- Policy to allow users to update their own files in postmedia bucket
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'postmedia' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own files in postmedia bucket
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'postmedia' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Additional policy for draft media (if you want to separate draft and post media)
-- This allows users to upload draft media files
CREATE POLICY "Allow authenticated users to upload draft files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'postmedia' AND 
  auth.role() = 'authenticated' AND
  name LIKE 'draftmedia/%'
);

-- Policy to allow users to manage their own draft files
CREATE POLICY "Allow users to manage their own draft files" ON storage.objects
FOR ALL USING (
  bucket_id = 'postmedia' AND 
  name LIKE 'draftmedia/%' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 