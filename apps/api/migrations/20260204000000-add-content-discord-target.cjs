'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'discordGuildId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Discord server (guild) ID when platforms includes discord'
    });
    await queryInterface.addColumn('Contents', 'discordChannelId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Discord channel ID where to publish when platforms includes discord'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'discordGuildId');
    await queryInterface.removeColumn('Contents', 'discordChannelId');
  }
};
