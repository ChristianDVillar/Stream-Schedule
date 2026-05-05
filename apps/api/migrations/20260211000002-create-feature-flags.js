/**
 * Migration: Create Feature Flags table
 * Allows enabling/disabling features without code deployment
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FeatureFlags', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Feature flag key (e.g., youtube_publish, bulk_upload)'
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the feature is enabled'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of what this feature flag controls'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional configuration for the feature'
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

    await queryInterface.addIndex('FeatureFlags', ['key'], {
      unique: true
    });
    await queryInterface.addIndex('FeatureFlags', ['enabled']);

    // Insert default feature flags
    await queryInterface.bulkInsert('FeatureFlags', [
      {
        key: 'youtube_publish',
        enabled: false,
        description: 'Enable YouTube publishing functionality',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'bulk_upload',
        enabled: false,
        description: 'Enable bulk content upload feature',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'automation_enabled',
        enabled: true,
        description: 'Enable automated publishing scheduler',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('FeatureFlags');
  }
};
