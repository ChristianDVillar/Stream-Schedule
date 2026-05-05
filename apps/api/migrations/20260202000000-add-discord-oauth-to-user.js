/** @type {import('sequelize-cli').Migration} */
/** Add Discord OAuth fields to User. Bot token stays in env only (never in DB). */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'discordAccessToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'discordRefreshToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'discordAccessToken');
    await queryInterface.removeColumn('Users', 'discordRefreshToken');
  },
};
