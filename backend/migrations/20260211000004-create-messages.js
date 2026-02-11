/**
 * Migration: Create Messages table
 * Messages from users to administrators
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Messages', {
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
        onDelete: 'CASCADE',
        comment: 'User who sent the message'
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Message subject'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Message content'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'unread',
        comment: 'Message status: unread, read, replied, archived'
      },
      adminReply: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin reply to the message'
      },
      repliedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When admin replied'
      },
      repliedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who replied'
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When message was first read by admin'
      },
      readBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who read the message'
      },
      priority: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Message priority'
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Message category'
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

    await queryInterface.addIndex('Messages', ['userId']);
    await queryInterface.addIndex('Messages', ['status']);
    await queryInterface.addIndex('Messages', ['priority']);
    await queryInterface.addIndex('Messages', ['category']);
    await queryInterface.addIndex('Messages', ['createdAt']);
    await queryInterface.addIndex('Messages', ['readAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Messages');
  }
};
