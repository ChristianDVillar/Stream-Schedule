/** @param {import('sequelize').QueryInterface} queryInterface */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('Users', 'akoenetSendClips', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'When true, POST Twitch clip metadata to AkoeNet webhook after Discord publish',
  });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
export async function down(queryInterface) {
  await queryInterface.removeColumn('Users', 'akoenetSendClips');
}
