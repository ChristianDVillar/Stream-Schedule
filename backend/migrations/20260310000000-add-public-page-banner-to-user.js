'use strict';

/** Add public page customization: banner image URL and position */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'publicPageBannerUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Banner/image URL for the public shared calendar page',
    });
    await queryInterface.addColumn('Users', 'publicPageBannerPosition', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'top',
      comment: 'Position of banner: top, above-avatar, above-schedule, center, bottom, background',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'publicPageBannerUrl');
    await queryInterface.removeColumn('Users', 'publicPageBannerPosition');
  },
};
