/**
 * Ensure all Contents columns exist.
 * Adds any column that was introduced by previous migrations but is missing in the DB.
 * Safe to run multiple times (only adds missing columns).
 *
 * Original migrations reference:
 * - 20260119210000: timezone, recurrence
 * - 20260204000000: discordGuildId, discordChannelId
 * - 20260205000000: publishedAt, publishError
 * - 20260211000001: idempotencyKeys, retryCount, lastRetryAt
 * - 20260216000000: eventEndTime, eventDates
 * - 20260217000000: eventLocationUrl
 * - 20260218000000: discordEventId
 * - 20260219000000: localVersion, discordEventVersion, discordSyncHash, lastSyncedAt, deletedAt
 * - 20260220000000: twitchSegmentId
 */

export default {
  async up(queryInterface, Sequelize) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);

    const toAdd = [
      { name: 'timezone', type: Sequelize.STRING, allowNull: true },
      { name: 'recurrence', type: Sequelize.JSONB, allowNull: true },
      { name: 'discordGuildId', type: Sequelize.STRING, allowNull: true },
      { name: 'discordChannelId', type: Sequelize.STRING, allowNull: true },
      { name: 'publishedAt', type: Sequelize.DATE, allowNull: true },
      { name: 'publishError', type: Sequelize.STRING, allowNull: true },
      { name: 'idempotencyKeys', type: Sequelize.JSONB, allowNull: true },
      { name: 'retryCount', type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      { name: 'lastRetryAt', type: Sequelize.DATE, allowNull: true },
      { name: 'eventEndTime', type: Sequelize.DATE, allowNull: true },
      { name: 'eventDates', type: Sequelize.JSONB, allowNull: true },
      { name: 'eventLocationUrl', type: Sequelize.STRING, allowNull: true },
      { name: 'discordEventId', type: Sequelize.STRING, allowNull: true },
      { name: 'localVersion', type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      { name: 'discordEventVersion', type: Sequelize.INTEGER, allowNull: true },
      { name: 'discordSyncHash', type: Sequelize.STRING, allowNull: true },
      { name: 'lastSyncedAt', type: Sequelize.DATE, allowNull: true },
      { name: 'deletedAt', type: Sequelize.DATE, allowNull: true },
      { name: 'twitchSegmentId', type: Sequelize.STRING, allowNull: true },
    ];

    for (const col of toAdd) {
      if (columns[col.name]) continue;
      const { name, ...def } = col;
      await queryInterface.addColumn(table, name, def);
    }

    // Index may have been added by 20260211000001
    try {
      await queryInterface.addIndex(table, ['status'], { name: 'contents_status_idx' });
    } catch (e) {
      if (!e.message?.includes('already exists') && e.original?.code !== '42701') throw e;
    }
  },

  async down() {
    // No-op: down would require knowing which columns we added; safe to leave columns in place
  },
};
