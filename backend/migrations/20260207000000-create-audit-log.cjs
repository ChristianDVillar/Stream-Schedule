'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AuditLogs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resourceType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('AuditLogs', ['userId'], {
      name: 'audit_logs_user_id_idx',
    });
    await queryInterface.addIndex('AuditLogs', ['action'], {
      name: 'audit_logs_action_idx',
    });
    await queryInterface.addIndex('AuditLogs', ['resourceType', 'resourceId'], {
      name: 'audit_logs_resource_idx',
    });
    await queryInterface.addIndex('AuditLogs', ['createdAt'], {
      name: 'audit_logs_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AuditLogs');
  },
};
