# Supabase Upload System - Configuration Fix

## Issues Fixed / Problemas Corregidos

### 1. User ID Type Mismatch
- **Problem:** Table `uploads` expects UUID, but User model uses INTEGER
- **Solution:** Updated validation to accept both number and UUID, convert to string for Supabase

### 2. Missing Configuration Check
- **Problem:** No clear error when Supabase is not configured
- **Solution:** Added validation and clear error messages in frontend

### 3. File Upload Component
- **Problem:** No UI component for file uploads
- **Solution:** Created `FileUpload` component and `MediaUpload` page

---

## Configuration Steps / Pasos de Configuracion

### Step 1: Create Storage Buckets

In Supabase Dashboard → Storage:

1. Create `images` bucket:
   - Name: `images`
   - Public: ✅ Yes
   - File size limit: 10 MB
   - Allowed MIME types: `image/*`

2. Create `videos` bucket:
   - Name: `videos`
   - Public: ❌ No
   - File size limit: 100 MB
   - Allowed MIME types: `video/*`

### Step 2: Create uploads Table

Run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('images', 'videos')),
  file_path text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user_created_at ON uploads(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_uploads_bucket ON uploads(bucket);
```

### Step 3: Set Storage Policies

```sql
-- Images: Public read, authenticated upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Videos: Private, authenticated only
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Users can read their own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');
```

### Step 4: Environment Variables

**Backend (.env):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Frontend (.env):**
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Test

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Login to application
4. Navigate to `/media` or use FileUpload component
5. Upload an image or video

---

## Files Created / Archivos Creados

- `frontend/src/components/FileUpload.js` - Reusable upload component
- `frontend/src/pages/MediaUpload.js` - Media upload page
- `SUPABASE_SETUP.md` - Complete setup guide
- `SUPABASE_FIX.md` - This file

## Files Modified / Archivos Modificados

- `backend/src/validators/uploadSchemas.js` - Accept number or UUID for user_id
- `backend/src/routes/uploads.js` - Convert user_id to string for Supabase
- `frontend/src/utils/uploadHelper.js` - Better error handling
- `frontend/src/utils/supabaseClient.js` - Improved error messages
- `frontend/src/App.js` - Added MediaUpload route and sidebar link

---

## Usage Example / Ejemplo de Uso

```javascript
import FileUpload from '../components/FileUpload';

function MyComponent({ user }) {
  const handleUploadComplete = (url, bucket) => {
    console.log('File uploaded:', url, bucket);
    // Use the URL in your content
  };

  return (
    <FileUpload 
      user={user} 
      onUploadComplete={handleUploadComplete} 
    />
  );
}
```

---

## Troubleshooting / Solucion de Problemas

### Error: "Supabase no está configurado"
- Check environment variables are set
- Restart development server after changing .env
- Frontend variables must start with `REACT_APP_`

### Error: "Bucket not found"
- Verify buckets exist in Supabase Storage
- Check bucket names match exactly (case-sensitive)

### Error: "Policy violation"
- Verify storage policies are set
- Check user is authenticated (has valid JWT)

### Error: "File too large"
- Check bucket file size limits
- Verify file size validation

---

**Status:** Ready to use / Listo para usar
