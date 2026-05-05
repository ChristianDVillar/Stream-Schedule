/** @type {import('sequelize-cli').Migration} */
/** Add googleId, twitchId, discordId so one account can link multiple OAuth providers. */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'googleId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'twitchId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'discordId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'googleId');
    await queryInterface.removeColumn('Users', 'twitchId');
    await queryInterface.removeColumn('Users', 'discordId');
  },
};
