/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'akoenetWebhookUrl', {
      type: Sequelize.STRING(2000),
      allowNull: true,
      comment: 'Full POST URL to AkoeNet stream-scheduled webhook (http://localhost, ngrok, etc.)',
    });
    await queryInterface.addColumn('Users', 'akoenetWebhookSecret', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Shared secret for x-scheduler-webhook-secret; never expose to client',
    });
    await queryInterface.addColumn('Users', 'akoenetAnnounceChannelId', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Optional AkoeNet channel id for payload.channel_id',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'akoenetAnnounceChannelId');
    await queryInterface.removeColumn('Users', 'akoenetWebhookSecret');
    await queryInterface.removeColumn('Users', 'akoenetWebhookUrl');
  },
};
