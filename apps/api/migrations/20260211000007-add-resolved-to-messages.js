/**
 * Migration: Add resolved fields to Messages table
 * Support for marking conversations as resolved
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Messages', 'resolved', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the conversation is resolved/closed'
    });

    await queryInterface.addColumn('Messages', 'resolvedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the conversation was marked as resolved'
    });

    await queryInterface.addColumn('Messages', 'resolvedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Admin user who resolved the conversation'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Messages', 'resolved');
    await queryInterface.removeColumn('Messages', 'resolvedAt');
    await queryInterface.removeColumn('Messages', 'resolvedBy');
  }
};
