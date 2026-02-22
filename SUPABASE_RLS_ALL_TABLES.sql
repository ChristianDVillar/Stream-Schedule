-- Enable RLS on all public tables (Supabase / PostgREST)
-- Run this in Supabase Dashboard → SQL Editor
-- Resolves: "Table public.<name> is public, but RLS has not been enabled."

-- ============================================
-- Application tables (Sequelize)
-- ============================================
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Contents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Platforms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentMedias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentTemplates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SystemConfigs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FeatureFlags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MessageReplies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationReads" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- uploads (Supabase storage metadata / custom table; name often lowercase)
-- ============================================
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Optional: migrations table (only if exposed to PostgREST; usually not)
-- Uncomment if you see the warning for this table:
-- ALTER TABLE public."SequelizeMeta" ENABLE ROW LEVEL SECURITY;
-- ============================================

-- With RLS enabled and no policies, only the service_role (backend) can access these tables.
-- Add policies below if you expose any table to authenticated/anon via PostgREST.
