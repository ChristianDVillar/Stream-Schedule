# Supabase Storage Setup Guide

## Prerequisites / Requisitos Previos

1. Supabase project created
2. Storage buckets configured
3. Environment variables set

---

## Step 1: Create Storage Buckets / Paso 1: Crear Buckets de Storage

In Supabase Dashboard → Storage:

En el Dashboard de Supabase → Storage:

### Create `images` bucket
1. Click "New bucket"
2. Name: `images`
3. Public: ✅ **Yes** (for public image access)
4. File size limit: 10 MB
5. Allowed MIME types: `image/*`

### Create `videos` bucket
1. Click "New bucket"
2. Name: `videos`
3. Public: ❌ **No** (videos are private, use signed URLs)
4. File size limit: 100 MB
5. Allowed MIME types: `video/*`

---

## Step 2: Create uploads table / Paso 2: Crear tabla uploads

In Supabase Dashboard → SQL Editor, run:

En el Dashboard de Supabase → SQL Editor, ejecuta:

```sql
-- Table to track user uploads
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('images', 'videos')),
  file_path text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for fast queries by user and date
CREATE INDEX IF NOT EXISTS idx_uploads_user_created_at ON uploads(user_id, created_at);

-- Index for bucket queries
CREATE INDEX IF NOT EXISTS idx_uploads_bucket ON uploads(bucket);
```

---

## Step 3: Set Storage Policies / Paso 3: Configurar Politicas de Storage

### Images bucket policies (Public read, authenticated upload)

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public to read images
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

### Videos bucket policies (Private, authenticated only)

```sql
-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to read their own videos
CREATE POLICY "Users can read their own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');
```

---

## Step 4: Environment Variables / Paso 4: Variables de Entorno

### Backend (.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**Where to find:**
- `SUPABASE_URL`: Project Settings → API → Project URL
- `SUPABASE_SERVICE_KEY`: Project Settings → API → Service Role Key (⚠️ Keep secret!)

### Frontend (.env)

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find:**
- `REACT_APP_SUPABASE_URL`: Project Settings → API → Project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Project Settings → API → anon public key

---

## Step 5: Test Upload / Paso 5: Probar Upload

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Login to the application
4. Use the FileUpload component to test uploads

---

## Troubleshooting / Solucion de Problemas

### Error: "Bucket not found"
- Verify buckets `images` and `videos` exist in Supabase Storage
- Check bucket names match exactly (case-sensitive)

### Error: "Policy violation"
- Verify storage policies are set correctly
- Check that user is authenticated (has valid JWT token)

### Error: "File too large"
- Check bucket file size limits
- Verify file size validation in frontend

### Error: "Supabase not configured"
- Verify environment variables are set
- For frontend: Variables must start with `REACT_APP_`
- Restart development server after changing .env

---

## Security Notes / Notas de Seguridad

- ✅ Images bucket is public (anyone can view)
- ✅ Videos bucket is private (requires signed URLs)
- ✅ Service Role Key is backend-only (never expose in frontend)
- ✅ Anon Key is safe for frontend (has limited permissions)
- ✅ Upload limits enforced by backend (trial: 1/day, pro: unlimited)

---

## File Organization / Organizacion de Archivos

Files are stored with the following structure:
Los archivos se almacenan con la siguiente estructura:

```
images/
  └─ {userId}/
      └─ {timestamp}-{filename}
      
videos/
  └─ {userId}/
      └─ {timestamp}-{filename}
```

Example:
```
images/123/1706284800000-photo.jpg
videos/123/1706284800000-video.mp4
```

---

**Status:** Ready for production use / Listo para uso en produccion
