/**
 * Migration: Add twitchSegmentId to Content table
 * Stores the Twitch schedule segment ID when an event/stream is published to Twitch Schedule
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'twitchSegmentId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Twitch schedule segment ID after creating segment via Helix API'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'twitchSegmentId');
  }
};
