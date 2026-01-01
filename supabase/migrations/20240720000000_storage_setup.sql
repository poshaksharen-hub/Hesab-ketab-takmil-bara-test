-- ====================================================================
-- HESAB KETAB: STORAGE BUCKET & POLICIES SETUP
-- ====================================================================

-- 1. Create the storage bucket if it doesn't exist.
-- The bucket is made public to allow easy access to uploaded files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hesabketabsatl', 'hesabketabsatl', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 2. Define Row Level Security (RLS) policies for the bucket.
-- These policies control who can do what with the files.
-- ====================================================================

-- --------------------------------------------------------------------
-- Policy: Allow public read access to all files.
-- This allows anyone to view the files, which is necessary for displaying
-- images and documents in the app.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'hesabketabsatl' );

-- --------------------------------------------------------------------
-- Policy: Allow authenticated users to upload files.
-- This policy lets any logged-in user upload files into the bucket.
-- It restricts them to only upload into a folder named with their own user ID.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hesabketabsatl' AND
  (storage.folder_name(name))[1] = auth.uid()::text
);

-- ====================================================================
-- END OF SCRIPT
-- ====================================================================
