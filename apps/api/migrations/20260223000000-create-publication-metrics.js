/**
 * Migration: Create PublicationMetrics table for admin cost/usage metrics.
 * Stores one row per job execution (success or final failure) for:
 * - Jobs executed per user
 * - Average execution time per user
 * - Retry rate per platform
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PublicationMetrics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      attemptsMade: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('PublicationMetrics', ['userId'], {
      name: 'idx_publication_metrics_user',
    });
    await queryInterface.addIndex('PublicationMetrics', ['platform'], {
      name: 'idx_publication_metrics_platform',
    });
    await queryInterface.addIndex('PublicationMetrics', ['completedAt'], {
      name: 'idx_publication_metrics_completed_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PublicationMetrics');
  },
};
