/** Allow null email for OAuth-only users (e.g. Twitter/X does not always provide email). */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },
};
