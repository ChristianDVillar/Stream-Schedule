/** Add twitterId so users can link X (Twitter) to an existing account (like googleId/twitchId). */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'twitterId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'twitterId');
  },
};
