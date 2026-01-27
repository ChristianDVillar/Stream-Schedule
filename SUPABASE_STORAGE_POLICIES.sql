-- Supabase Storage Policies Configuration
-- Execute these SQL commands in Supabase SQL Editor
-- Project: omdosutakaefpowscagp
-- URL: https://omdosutakaefpowscagp.supabase.co

-- ============================================
-- IMPORTANT: Enable RLS first
-- ============================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- IMAGES BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon uploads to images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to images" ON storage.objects;

-- Policy 1: Allow anonymous users to upload images (for anon key)
-- This allows uploads using the anon key from frontend
CREATE POLICY "Allow anon uploads to images"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'images');

-- Policy 2: Allow public to read images (images are public)
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy 3: Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads to images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- ============================================
-- VIDEOS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon uploads to videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read videos" ON storage.objects;

-- Policy 1: Allow anonymous users to upload videos (for anon key)
CREATE POLICY "Allow anon uploads to videos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'videos');

-- Policy 2: Allow authenticated users to upload videos
CREATE POLICY "Allow authenticated uploads to videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Policy 3: Allow authenticated users to read videos
CREATE POLICY "Allow authenticated read videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- Policy 4: Allow public to read videos (if you want videos to be accessible)
-- Uncomment if you want videos to be publicly readable:
-- CREATE POLICY "Public can read videos"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'videos');

-- ============================================
-- VERIFICATION
-- ============================================
-- After running these policies, verify they exist:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
