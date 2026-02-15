/**
 * Migration: Create Notifications and NotificationReads tables
 * Notifications = admin announcements to users (userId null = broadcast to all)
 * NotificationReads = per-user read state
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Null = broadcast to all users; set = only this user'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Notification title'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Notification body'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Admin user who created the notification'
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
    await queryInterface.addIndex('Notifications', ['userId']);
    await queryInterface.addIndex('Notifications', ['createdAt']);

    await queryInterface.createTable('NotificationReads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      notificationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Notifications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('NotificationReads', ['notificationId']);
    await queryInterface.addIndex('NotificationReads', ['userId']);
    await queryInterface.addIndex('NotificationReads', ['notificationId', 'userId'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('NotificationReads');
    await queryInterface.dropTable('Notifications');
  }
};
