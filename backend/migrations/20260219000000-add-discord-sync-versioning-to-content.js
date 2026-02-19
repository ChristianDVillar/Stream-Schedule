/**
 * Migration: Add Discord sync versioning and metadata to Content table
 * - localVersion: internal version (incremented on every local change)
 * - discordEventVersion: last version we know is in Discord
 * - discordSyncHash: idempotency / change detection
 * - lastSyncedAt: last successful sync with Discord
 * - deletedAt: soft delete (for events deleted in Discord or locally)
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'localVersion', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
    await queryInterface.addColumn('Contents', 'discordEventVersion', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('Contents', 'discordSyncHash', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Contents', 'lastSyncedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('Contents', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'localVersion');
    await queryInterface.removeColumn('Contents', 'discordEventVersion');
    await queryInterface.removeColumn('Contents', 'discordSyncHash');
    await queryInterface.removeColumn('Contents', 'lastSyncedAt');
    await queryInterface.removeColumn('Contents', 'deletedAt');
  },
};
