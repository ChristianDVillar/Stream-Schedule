'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Contents', 'publishedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the content was successfully published'
    });
    await queryInterface.addColumn('Contents', 'publishError', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Error message when publication failed'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Contents', 'publishedAt');
    await queryInterface.removeColumn('Contents', 'publishError');
  }
};
