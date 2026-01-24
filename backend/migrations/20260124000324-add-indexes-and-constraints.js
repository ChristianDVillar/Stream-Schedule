/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Add indexes for date fields (improves query performance)
    
    // Users: licenseExpiresAt (for license expiration queries)
    await queryInterface.addIndex('Users', ['licenseExpiresAt'], {
      name: 'users_license_expires_at_idx'
    });

    // Contents: scheduledFor (most common query field)
    await queryInterface.addIndex('Contents', ['scheduledFor'], {
      name: 'contents_scheduled_for_idx'
    });

    // Contents: status (for filtering by status)
    await queryInterface.addIndex('Contents', ['status'], {
      name: 'contents_status_idx'
    });

    // Contents: userId + scheduledFor (composite index for user's scheduled content)
    await queryInterface.addIndex('Contents', ['userId', 'scheduledFor'], {
      name: 'contents_user_scheduled_idx'
    });

    // Contents: userId + status (composite index for user's content by status)
    await queryInterface.addIndex('Contents', ['userId', 'status'], {
      name: 'contents_user_status_idx'
    });

    // Payments: paidAt (for payment history queries)
    await queryInterface.addIndex('Payments', ['paidAt'], {
      name: 'payments_paid_at_idx'
    });

    // Payments: status (for filtering by payment status)
    await queryInterface.addIndex('Payments', ['status'], {
      name: 'payments_status_idx'
    });

    // Payments: userId + status (composite index for user's payments by status)
    await queryInterface.addIndex('Payments', ['userId', 'status'], {
      name: 'payments_user_status_idx'
    });

    // Platforms: expiresAt (for token expiration checks)
    await queryInterface.addIndex('Platforms', ['expiresAt'], {
      name: 'platforms_expires_at_idx'
    });

    // Media: userId (for user's media queries)
    await queryInterface.addIndex('Media', ['userId'], {
      name: 'media_user_id_idx'
    });

    // Add UNIQUE constraint: (userId, platform) in Platforms
    // This ensures a user can only have one configuration per platform
    await queryInterface.addIndex('Platforms', ['userId', 'platform'], {
      unique: true,
      name: 'platforms_user_platform_unique_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes in reverse order
    await queryInterface.removeIndex('Platforms', 'platforms_user_platform_unique_idx');
    await queryInterface.removeIndex('Media', 'media_user_id_idx');
    await queryInterface.removeIndex('Platforms', 'platforms_expires_at_idx');
    await queryInterface.removeIndex('Payments', 'payments_user_status_idx');
    await queryInterface.removeIndex('Payments', 'payments_status_idx');
    await queryInterface.removeIndex('Payments', 'payments_paid_at_idx');
    await queryInterface.removeIndex('Contents', 'contents_user_status_idx');
    await queryInterface.removeIndex('Contents', 'contents_user_scheduled_idx');
    await queryInterface.removeIndex('Contents', 'contents_status_idx');
    await queryInterface.removeIndex('Contents', 'contents_scheduled_for_idx');
    await queryInterface.removeIndex('Users', 'users_license_expires_at_idx');
  }
};
