/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'oauthProvider', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'oauthId', {
      type: Sequelize.STRING,
      allowNull: true
    });
    // Make passwordHash nullable for OAuth users
    await queryInterface.changeColumn('Users', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'oauthProvider');
    await queryInterface.removeColumn('Users', 'oauthId');
    // Revert passwordHash to not null
    await queryInterface.changeColumn('Users', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
