/**
 * Ensure Contents.deletedAt exists (fix for DBs where migration ran partially or was out of sync).
 */

export default {
  async up(queryInterface, Sequelize) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);
    if (!columns.deletedAt) {
      await queryInterface.addColumn(table, 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = 'Contents';
    const columns = await queryInterface.describeTable(table);
    if (columns.deletedAt) {
      await queryInterface.removeColumn(table, 'deletedAt');
    }
  },
};
