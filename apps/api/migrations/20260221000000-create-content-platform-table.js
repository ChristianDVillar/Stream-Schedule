/**
 * Migration: Create ContentPlatform table
 * Tracks publication status per platform for each Content item.
 * Enables independent retries, better metrics, and scalability.
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ContentPlatforms', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      contentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Contents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to Content'
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Platform name: discord, twitter, twitch, youtube, instagram'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Publication status: pending, queued, publishing, published, failed, retrying, canceled'
      },
      externalId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID returned by the platform (e.g. tweet ID, Discord message ID, Twitch segment ID)'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if publication failed'
      },
      retryCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of retry attempts'
      },
      nextRetryAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next retry time (exponential backoff)'
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When successfully published on this platform'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Platform-specific metadata (e.g. Discord event ID, Twitter tweet URL)'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes for performance
    await queryInterface.addIndex('ContentPlatforms', ['contentId', 'platform'], {
      unique: true,
      name: 'content_platform_unique'
    });
    await queryInterface.addIndex('ContentPlatforms', ['status'], {
      name: 'idx_content_platform_status'
    });
    await queryInterface.addIndex('ContentPlatforms', ['nextRetryAt'], {
      name: 'idx_content_platform_retry'
    });
    await queryInterface.addIndex('ContentPlatforms', ['contentId'], {
      name: 'idx_content_platform_content'
    });
    await queryInterface.addIndex('ContentPlatforms', ['platform', 'status'], {
      name: 'idx_content_platform_platform_status'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ContentPlatforms');
  }
};
