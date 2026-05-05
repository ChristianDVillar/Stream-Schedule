/**
 * Migration: Add eventLocationUrl field to Content table
 * Supports Discord external events with custom URLs (e.g. Twitch stream links)
 */

export default {
  async up(queryInterface, Sequelize) {
    // Add eventLocationUrl column
    await queryInterface.addColumn('Contents', 'eventLocationUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'External URL for Discord events (e.g. Twitch stream URL, YouTube link) - used as event location'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'eventLocationUrl');
  }
};
