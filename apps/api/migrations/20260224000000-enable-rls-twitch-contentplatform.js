/**
 * Migration: Enable RLS on ContentPlatforms, PublicationMetrics, TwitchBitEvents, TwitchEventSubSubscriptions.
 * Resolves Supabase alerts for these tables being public without RLS.
 * Run in PostgreSQL (Supabase). No-op if not postgres or if RLS is already enabled.
 */

export default {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    const tables = [
      'ContentPlatforms',
      'PublicationMetrics',
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
      'PublicationMetrics',
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
