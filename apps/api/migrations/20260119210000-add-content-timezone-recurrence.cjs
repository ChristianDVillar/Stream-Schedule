'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'timezone', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Contents', 'recurrence', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Contents', 'timezone');
    await queryInterface.removeColumn('Contents', 'recurrence');
  }
};
