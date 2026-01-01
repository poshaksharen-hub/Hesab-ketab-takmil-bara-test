-- This script sets up the storage bucket and its policies.

-- 1. Create the bucket if it doesn't exist. It's public for easy access to URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hesabketabsatl', 'hesabketabsatl', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts before creating new ones.
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;


-- 3. Create a policy to allow any authenticated user to UPLOAD files anywhere in the bucket.
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hesabketabsatl' AND
  auth.role() = 'authenticated'
);

-- 4. Create a policy to allow ANYONE (including unauthenticated users) to VIEW files.
-- This is necessary for the app to display images via their public URL.
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'hesabketabsatl' );
