/**
 * Migration: Add idempotency fields to Content table
 * Prevents duplicate publications on retries
 */

export default {
  async up(queryInterface, Sequelize) {
    // Add idempotency tracking
    await queryInterface.addColumn('Contents', 'idempotencyKeys', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Map of platform -> idempotency_key for publication tracking'
    });

    // Add retry count
    await queryInterface.addColumn('Contents', 'retryCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of retry attempts for failed publications'
    });

    // Add last retry attempt timestamp
    await queryInterface.addColumn('Contents', 'lastRetryAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last retry attempt'
    });

    // Index for idempotency lookups
    await queryInterface.addIndex('Contents', ['status'], {
      name: 'contents_status_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'idempotencyKeys');
    await queryInterface.removeColumn('Contents', 'retryCount');
    await queryInterface.removeColumn('Contents', 'lastRetryAt');
    await queryInterface.removeIndex('Contents', 'contents_status_idx');
  }
};
