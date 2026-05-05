/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Add subscription fields to Users table
    await queryInterface.addColumn('Users', 'stripeCustomerId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Stripe Customer ID for subscriptions'
    });

    await queryInterface.addColumn('Users', 'stripeSubscriptionId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Stripe Subscription ID for recurring payments'
    });

    await queryInterface.addColumn('Users', 'subscriptionStatus', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Subscription status: active, canceled, past_due, etc.'
    });

    // Add subscription fields to Payments table
    await queryInterface.addColumn('Payments', 'stripeSubscriptionId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Stripe Subscription ID if this payment is part of a subscription'
    });

    await queryInterface.addColumn('Payments', 'isRecurring', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this payment is part of a recurring subscription'
    });

    // Add index for subscription lookups
    await queryInterface.addIndex('Users', ['stripeCustomerId'], {
      name: 'users_stripe_customer_id_idx'
    });

    await queryInterface.addIndex('Users', ['stripeSubscriptionId'], {
      name: 'users_stripe_subscription_id_idx'
    });

    await queryInterface.addIndex('Payments', ['stripeSubscriptionId'], {
      name: 'payments_stripe_subscription_id_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('Payments', 'payments_stripe_subscription_id_idx');
    await queryInterface.removeIndex('Users', 'users_stripe_subscription_id_idx');
    await queryInterface.removeIndex('Users', 'users_stripe_customer_id_idx');

    // Remove columns from Payments
    await queryInterface.removeColumn('Payments', 'isRecurring');
    await queryInterface.removeColumn('Payments', 'stripeSubscriptionId');

    // Remove columns from Users
    await queryInterface.removeColumn('Users', 'subscriptionStatus');
    await queryInterface.removeColumn('Users', 'stripeSubscriptionId');
    await queryInterface.removeColumn('Users', 'stripeCustomerId');
  }
};
