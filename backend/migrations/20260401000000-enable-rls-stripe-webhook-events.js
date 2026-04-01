/**
 * Migration: Enable RLS on StripeWebhookEvents.
 * Resolves Supabase "RLS Disabled in Public" for this table exposed to PostgREST.
 * Run in PostgreSQL (Supabase). No-op if not postgres or if RLS is already enabled.
 */

export default {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    await queryInterface.sequelize.query(
      'ALTER TABLE public."StripeWebhookEvents" ENABLE ROW LEVEL SECURITY;'
    );
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    await queryInterface.sequelize.query(
      'ALTER TABLE public."StripeWebhookEvents" DISABLE ROW LEVEL SECURITY;'
    );
  },
};
