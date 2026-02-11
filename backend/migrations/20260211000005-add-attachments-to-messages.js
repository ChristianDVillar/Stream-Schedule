/**
 * Migration: Add attachments to Messages table
 * Support for image attachments in messages and replies
 */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Messages', 'attachments', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of attachment URLs/paths (from user)'
    });

    await queryInterface.addColumn('Messages', 'replyAttachments', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of attachment URLs/paths (from admin reply)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Messages', 'attachments');
    await queryInterface.removeColumn('Messages', 'replyAttachments');
  }
};
