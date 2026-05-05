'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'licenseType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'none'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'licenseType');
  }
};
