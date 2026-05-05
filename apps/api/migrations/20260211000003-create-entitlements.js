/**
 * Migration: Create Entitlements table
 * Granular feature entitlements based on license/subscription
 * More flexible than simple plan flags
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Entitlements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      feature: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Feature name (e.g., maxScheduledPosts, platformsAllowed, automationEnabled)'
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Feature value (number, array, boolean, etc.)'
      },
      source: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'license',
        comment: 'Source: license, subscription, override, trial'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this entitlement expires (null = permanent)'
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

    await queryInterface.addIndex('Entitlements', ['userId', 'feature'], {
      unique: true,
      name: 'entitlements_user_feature_unique'
    });
    await queryInterface.addIndex('Entitlements', ['userId']);
    await queryInterface.addIndex('Entitlements', ['expiresAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Entitlements');
  }
};
