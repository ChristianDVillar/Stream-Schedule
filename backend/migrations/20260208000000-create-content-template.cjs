'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ContentTemplates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      contentType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platforms: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      hashtags: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mentions: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      variables: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.addIndex('ContentTemplates', ['userId'], {
      name: 'content_templates_user_id_idx',
    });
    await queryInterface.addIndex('ContentTemplates', ['isPublic'], {
      name: 'content_templates_is_public_idx',
    });
    await queryInterface.addIndex('ContentTemplates', ['name'], {
      name: 'content_templates_name_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ContentTemplates');
  },
};
