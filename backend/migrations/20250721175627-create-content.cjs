'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Contents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING
      },
      content: {
        type: Sequelize.TEXT
      },
      contentType: {
        type: Sequelize.STRING
      },
      scheduledFor: {
        type: Sequelize.DATE
      },
      hashtags: {
        type: Sequelize.STRING
      },
      mentions: {
        type: Sequelize.STRING
      },
      platforms: {
        type: Sequelize.JSONB
      },
      files: {
        type: Sequelize.JSONB
      },
      userId: {
        type: Sequelize.INTEGER
      },
      status: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Contents');
  }
};