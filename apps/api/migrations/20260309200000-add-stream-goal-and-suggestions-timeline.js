/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'streamGoalType', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'streamGoalTarget', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.createTable('StreamSuggestions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      text: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      suggestedBy: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('StreamSuggestions', ['userId']);
    await queryInterface.addIndex('StreamSuggestions', ['createdAt']);

    await queryInterface.createTable('StreamTimelineEvents', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('StreamTimelineEvents', ['userId']);
    await queryInterface.addIndex('StreamTimelineEvents', ['userId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('StreamTimelineEvents');
    await queryInterface.dropTable('StreamSuggestions');
    await queryInterface.removeColumn('Users', 'streamGoalTarget');
    await queryInterface.removeColumn('Users', 'streamGoalType');
  },
};
