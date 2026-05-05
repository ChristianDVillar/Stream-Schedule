/**
 * Ensure Contents.eventEndTime and Contents.eventDates exist.
 * Fix for DBs where the original migration (20260216000000) did not run or ran partially.
 */

export default {
  async up(queryInterface, Sequelize) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);

    if (!columns.eventEndTime) {
      await queryInterface.addColumn(table, 'eventEndTime', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!columns.eventDates) {
      await queryInterface.addColumn(table, 'eventDates', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);
    if (columns.eventEndTime) {
      await queryInterface.removeColumn(table, 'eventEndTime');
    }
    if (columns.eventDates) {
      await queryInterface.removeColumn(table, 'eventDates');
    }
  },
};
