/** @param {import('sequelize').QueryInterface} queryInterface */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('Users', 'akoenetServerId', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: 'AkoeNet server/community id (for channel picker; optional in payload)',
  });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
export async function down(queryInterface) {
  await queryInterface.removeColumn('Users', 'akoenetServerId');
}
