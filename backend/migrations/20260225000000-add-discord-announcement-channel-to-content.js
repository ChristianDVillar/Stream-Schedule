/**
 * Migration: Add discordAnnouncementChannelId to Content table
 * Optional channel where to post an announcement when a Discord event is created.
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'discordAnnouncementChannelId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Optional Discord channel ID to post an announcement when event is created'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'discordAnnouncementChannelId');
  }
};
