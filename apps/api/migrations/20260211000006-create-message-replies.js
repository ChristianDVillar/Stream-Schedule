/**
 * Migration: Create MessageReplies table
 * Support for multiple replies in a conversation thread
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MessageReplies', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      messageId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Parent message ID'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who sent the reply (can be user or admin)'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Reply content'
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of attachment URLs/paths'
      },
      isAdmin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this reply is from an admin'
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

    await queryInterface.addIndex('MessageReplies', ['messageId']);
    await queryInterface.addIndex('MessageReplies', ['userId']);
    await queryInterface.addIndex('MessageReplies', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MessageReplies');
  }
};
