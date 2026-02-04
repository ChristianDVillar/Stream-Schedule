'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'dashboardShowTwitchSubs', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn('Users', 'dashboardShowTwitchBits', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn('Users', 'dashboardShowTwitchDonations', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'dashboardShowTwitchSubs');
    await queryInterface.removeColumn('Users', 'dashboardShowTwitchBits');
    await queryInterface.removeColumn('Users', 'dashboardShowTwitchDonations');
  }
};
