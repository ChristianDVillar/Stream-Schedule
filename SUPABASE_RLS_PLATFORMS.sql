-- Enable RLS on public.Platforms (Supabase / PostgREST)
-- Run this in Supabase Dashboard → SQL Editor
-- Resolves: "Table public.Platforms is public, but RLS has not been enabled."

-- Enable Row Level Security
ALTER TABLE public."Platforms" ENABLE ROW LEVEL SECURITY;

-- Optional: if you ever expose this table via PostgREST to authenticated users,
-- add a policy so users only see their own rows. Otherwise only service_role (backend) can access.
-- Example (uncomment and adjust if using Supabase Auth and a matching user id):
-- CREATE POLICY "Users can read own platforms"
--   ON public."Platforms" FOR SELECT
--   TO authenticated
--   USING ("userId" = (SELECT id FROM public."Users" WHERE email = auth.jwt()->>'email' LIMIT 1));
