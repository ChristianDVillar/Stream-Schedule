/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'merchandisingLink', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'merchandisingLink');
  }
};
