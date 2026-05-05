/**
 * Ensure Contents.eventLocationUrl exists.
 * Fix for DBs where migration 20260217000000 did not run.
 */

export default {
  async up(queryInterface, Sequelize) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);

    if (!columns.eventLocationUrl) {
      await queryInterface.addColumn(table, 'eventLocationUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);
    if (columns.eventLocationUrl) {
      await queryInterface.removeColumn(table, 'eventLocationUrl');
    }
  },
};
