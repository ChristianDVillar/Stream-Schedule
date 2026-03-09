/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ReminderSents', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      streamReminderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'StreamReminders', key: 'id' },
        onDelete: 'CASCADE',
      },
      contentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Contents', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ReminderSents', ['streamReminderId', 'contentId'], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ReminderSents');
  },
};
