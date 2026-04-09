-- =============================================================================
-- Supabase: fix "RLS Disabled in Public"
-- =============================================================================
-- Supabase shows this when tables in schema "public" are exposed to the API
-- but Row Level Security (RLS) is not enabled. Without RLS, the anon key could
-- read/write those tables if PostgREST is used directly.
--
-- This script enables RLS on all app tables. Your backend uses the service_role
-- key (or DATABASE_URL), which bypasses RLS, so behaviour is unchanged.
-- Only direct access via Supabase anon key becomes denied by default.
--
-- Run once: Supabase Dashboard → SQL Editor → paste and Run.
-- =============================================================================

-- =============================================================================
-- Supabase: enable RLS on all public tables (with report)
-- =============================================================================
-- Checks which tables already have RLS enabled and enables RLS on the rest.
-- Provides a notice/report for each table.
-- =============================================================================

DO $$
DECLARE
    r record;
    rls_status boolean;
BEGIN
    FOR r IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
    LOOP
        -- check current RLS status
        SELECT relrowsecurity
        INTO rls_status
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = r.table_name;

        IF rls_status THEN
            RAISE NOTICE 'Table % already has RLS enabled.', r.table_name;
        ELSE
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
            RAISE NOTICE 'RLS enabled for table: %', r.table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- Alternative: explicit list (optional reference)
-- ============================================
-- If you prefer not to use the dynamic block above, uncomment and run the
-- ALTER TABLE statements below. The dynamic block above already covers all
-- current tables and any new ones you add later.
-- ============================================
/*
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
ALTER TABLE public."ContentPlatforms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PublicationMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TwitchBitEvents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Todos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StreamReminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StreamItems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StreamSuggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StreamTimelineEvents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReminderSents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TwitchEventSubSubscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StripeWebhookEvents" ENABLE ROW LEVEL SECURITY;

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
-- Add policies below if you ever expose a table to authenticated/anon via PostgREST.
*/
