-- Fix uploads table user_id column type from UUID to TEXT
-- This allows storing numeric user IDs from Sequelize
-- Run this in Supabase SQL Editor

-- Step 1: Check if there are any existing records (optional)
-- SELECT COUNT(*) FROM uploads;

-- Step 2: If there are existing records with UUID values, you may need to handle them
-- For now, we'll convert UUID to TEXT (existing UUIDs will be converted to their string representation)

-- Step 3: Change the column type from UUID to TEXT
-- This will convert any existing UUID values to their string representation
ALTER TABLE uploads 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);

-- Step 5: Verify the change
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'uploads' AND column_name = 'user_id';
-- Should show: data_type = 'text'

-- Add a comment to document the change
COMMENT ON COLUMN uploads.user_id IS 'User ID stored as TEXT to support numeric IDs from Sequelize';
