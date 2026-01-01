-- ====================================================================
-- HESAB KETAB: STORAGE BUCKET & SECURITY POLICIES
-- ====================================================================

-- 1. Create the bucket for all application file uploads.
-- We make it public to allow easy read access for displaying images via URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hesabketabsatl', 'hesabketabsatl', true)
ON CONFLICT (id) DO NOTHING;


-- 2. Policy: Allow public read access to all files.
-- This is necessary for the application to display images.
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'hesabketabsatl' );


-- 3. Policy: Allow authenticated users to UPLOAD files into their own folder.
-- This stricter policy ensures that a user can only insert a file into a path
-- that starts with their own user ID as the second segment (e.g., 'receipts/<user_id>/file.jpg').
CREATE POLICY "Allow authenticated users to upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hesabketabsatl' AND
  auth.role() = 'authenticated' AND
  (string_to_array(name, '/'))[2] = auth.uid()::text
);


-- 4. Policy: Allow authenticated users to DELETE their OWN files.
-- This policy allows a user to delete an object if they were the one who uploaded it.
-- The `owner` field in `storage.objects` automatically stores the UID of the uploader.
CREATE POLICY "Allow authenticated users to delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'hesabketabsatl' AND
    auth.uid() = owner
);

-- ====================================================================
-- END OF SCRIPT
-- ====================================================================
