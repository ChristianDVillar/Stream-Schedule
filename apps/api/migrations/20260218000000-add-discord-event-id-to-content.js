/**
 * Migration: Add discordEventId to Content table
 * Stores the Discord scheduled event ID so we can build the public event link:
 * https://discord.com/events/{guildId}/{eventId}
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'discordEventId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Discord scheduled event ID after creation; link: https://discord.com/events/{guildId}/{eventId}'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'discordEventId');
  }
};
