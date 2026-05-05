/**
 * Migration: Create Integrations table
 * Separates OAuth integrations (for publishing) from Auth (for login)
 * This allows users to revoke integrations without affecting their login
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Integrations', {
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
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Platform provider: twitter, discord, youtube, instagram, etc.'
      },
      providerUserId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'User ID on the provider platform'
      },
      accessToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Encrypted OAuth access token'
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Encrypted OAuth refresh token'
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'OAuth scopes granted'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Token expiration date'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: [['active', 'expired', 'revoked', 'error']]
        }
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional provider-specific metadata'
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
    await queryInterface.addIndex('Integrations', ['userId', 'provider'], {
      unique: true,
      name: 'integrations_user_provider_unique'
    });
    await queryInterface.addIndex('Integrations', ['provider', 'status']);
    await queryInterface.addIndex('Integrations', ['expiresAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Integrations');
  }
};
