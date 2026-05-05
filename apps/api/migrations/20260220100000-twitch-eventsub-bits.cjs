'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TwitchBitEvents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      broadcasterUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Twitch broadcaster (channel) user id',
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Twitch user id who cheered',
      },
      user_login: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      message_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Twitch-Eventsub-Message-Id for deduplication',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('TwitchBitEvents', ['broadcasterUserId', 'createdAt']);
    await queryInterface.addIndex('TwitchBitEvents', ['message_id']);

    await queryInterface.createTable('TwitchEventSubSubscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      broadcasterUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'One channel.cheer subscription per broadcaster',
      },
      subscriptionId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Twitch subscription id after creation',
      },
      secret: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Secret for HMAC verification',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('TwitchEventSubSubscriptions', ['subscriptionId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('TwitchBitEvents');
    await queryInterface.dropTable('TwitchEventSubSubscriptions');
  },
};
