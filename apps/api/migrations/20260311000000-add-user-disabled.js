/**
 * Add isDisabled flag to Users table (soft deactivation for admin)
 * When true, user login / API access is blocked without deleting data.
 */

export default {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      // Still safe in other dialects, but project is Postgres-first (Supabase)
    }
    await queryInterface.addColumn('Users', 'isDisabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, user is deactivated (soft delete) and cannot access the app.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'isDisabled');
  },
};

