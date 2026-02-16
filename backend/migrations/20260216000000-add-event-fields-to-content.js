/**
 * Migration: Add eventEndTime and eventDates fields to Content table
 * Supports Discord scheduled events with multiple dates
 */

export default {
  async up(queryInterface, Sequelize) {
    // Add eventEndTime column
    await queryInterface.addColumn('Contents', 'eventEndTime', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'End time for events (optional, used for Discord scheduled events)'
    });

    // Add eventDates column (JSONB array)
    await queryInterface.addColumn('Contents', 'eventDates', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Array of event dates/times for events with multiple occurrences [{date, time, endDate?, endTime?}]'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'eventEndTime');
    await queryInterface.removeColumn('Contents', 'eventDates');
  }
};
