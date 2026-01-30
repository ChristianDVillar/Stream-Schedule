/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('SystemConfigs', {
      key: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Initialize default license configuration
    // Check if record already exists before inserting
    const [results] = await queryInterface.sequelize.query(
      `SELECT key FROM "SystemConfigs" WHERE key = 'availableLicenseTypes'`
    );
    
    if (results.length === 0) {
      // Convert object to JSON string for JSONB field
      await queryInterface.bulkInsert('SystemConfigs', [{
        key: 'availableLicenseTypes',
        value: Sequelize.literal(`'${JSON.stringify({
          monthly: true,
          quarterly: false,
          lifetime: false,
          temporary: false
        })}'::jsonb`),
        description: 'Available license types for users to purchase',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('SystemConfigs');
  }
};
