/**
 * Migration: Add critical indexes to Content table
 * Improves scheduler query performance and dashboard loading.
 * Critical for scalability.
 */

export default {
  async up(queryInterface, Sequelize) {
    // Index for scheduler query: status + scheduledFor
    // This is the most critical query - runs every minute
    try {
      await queryInterface.addIndex('Contents', ['status', 'scheduledFor'], {
        name: 'idx_content_status_scheduled',
        where: {
          deletedAt: null
        }
      });
    } catch (error) {
      // Index might already exist, continue
      if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        throw error;
      }
    }

    // Index for user dashboard queries
    try {
      await queryInterface.addIndex('Contents', ['userId'], {
        name: 'idx_content_user'
      });
    } catch (error) {
      if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        throw error;
      }
    }

    // Index for status filtering (if not exists from previous migrations)
    try {
      await queryInterface.addIndex('Contents', ['status'], {
        name: 'idx_content_status'
      });
    } catch (error) {
      if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        throw error;
      }
    }

    // Composite index for user + status (common dashboard query)
    try {
      await queryInterface.addIndex('Contents', ['userId', 'status'], {
        name: 'idx_content_user_status'
      });
    } catch (error) {
      if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        throw error;
      }
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('Contents', 'idx_content_status_scheduled');
    } catch (error) {
      // Index might not exist
    }
    try {
      await queryInterface.removeIndex('Contents', 'idx_content_user');
    } catch (error) {}
    try {
      await queryInterface.removeIndex('Contents', 'idx_content_status');
    } catch (error) {}
    try {
      await queryInterface.removeIndex('Contents', 'idx_content_user_status');
    } catch (error) {}
  }
};
