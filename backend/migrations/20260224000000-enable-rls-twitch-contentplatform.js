/**
 * Migration: Enable RLS on ContentPlatforms, TwitchBitEvents, TwitchEventSubSubscriptions.
 * Resolves Supabase alerts:
 * - "Table public.TwitchEventSubSubscriptions is exposed via API without RLS and contains potentially sensitive column(s): secret"
 * - "Table public.TwitchBitEvents is public, but RLS has not been enabled"
 * - "Table public.ContentPlatforms is public, but RLS has not been enabled"
 * Run in PostgreSQL (Supabase). No-op if not postgres or if RLS is already enabled.
 */

export default {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    const tables = [
      'ContentPlatforms',
      'TwitchBitEvents',
      'TwitchEventSubSubscriptions',
    ];
    for (const table of tables) {
      await queryInterface.sequelize.query(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`
      );
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    const tables = [
      'ContentPlatforms',
      'TwitchBitEvents',
      'TwitchEventSubSubscriptions',
    ];
    for (const table of tables) {
      await queryInterface.sequelize.query(
        `ALTER TABLE public."${table}" DISABLE ROW LEVEL SECURITY;`
      );
    }
  },
};
