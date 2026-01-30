/**
 * Check License Expirations
 * Script to check for licenses expiring soon and send notifications
 * 
 * Run this script periodically (e.g., via cron job) to check for expiring licenses
 * 
 * Usage:
 *   node src/scripts/checkLicenseExpirations.js
 * 
 * Recommended: Run daily at 9 AM
 */

import { User } from '../models/index.js';
import { LICENSE_TYPES } from '../constants/licenseTypes.js';
import { sendLicenseExpirationWarning, sendLicenseExpiredNotification } from '../utils/notifications.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkExpirations() {
  console.log('🔍 Checking license expirations...\n');

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find users with licenses expiring in the next 7 days
    const usersExpiringSoon = await User.findAll({
      where: {
        licenseType: {
          [require('sequelize').Op.notIn]: [LICENSE_TYPES.NONE, LICENSE_TYPES.LIFETIME]
        },
        licenseExpiresAt: {
          [require('sequelize').Op.between]: [now, sevenDaysFromNow]
        }
      }
    });

    // Find users with expired licenses
    const expiredUsers = await User.findAll({
      where: {
        licenseType: {
          [require('sequelize').Op.notIn]: [LICENSE_TYPES.NONE, LICENSE_TYPES.LIFETIME]
        },
        licenseExpiresAt: {
          [require('sequelize').Op.lt]: now
        }
      }
    });

    console.log(`📊 Found ${usersExpiringSoon.length} licenses expiring soon`);
    console.log(`📊 Found ${expiredUsers.length} expired licenses\n`);

    // Send warnings for licenses expiring soon
    let warningsSent = 0;
    for (const user of usersExpiringSoon) {
      const expiryDate = new Date(user.licenseExpiresAt);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      // Send warning if expiring in 7 days or 3 days
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        try {
          await sendLicenseExpirationWarning(user, daysUntilExpiry);
          warningsSent++;
          console.log(`✅ Sent ${daysUntilExpiry}-day warning to ${user.email}`);
        } catch (error) {
          console.error(`❌ Failed to send warning to ${user.email}:`, error.message);
        }
      }
    }

    // Send notifications for expired licenses
    let expiredNotificationsSent = 0;
    for (const user of expiredUsers) {
      try {
        await sendLicenseExpiredNotification(user);
        expiredNotificationsSent++;
        console.log(`✅ Sent expiration notification to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send expiration notification to ${user.email}:`, error.message);
      }
    }

    console.log(`\n📧 Summary:`);
    console.log(`   Warnings sent: ${warningsSent}`);
    console.log(`   Expiration notifications sent: ${expiredNotificationsSent}`);

    logger.info('License expiration check completed', {
      expiringSoon: usersExpiringSoon.length,
      expired: expiredUsers.length,
      warningsSent,
      expiredNotificationsSent
    });

  } catch (error) {
    console.error('❌ Error checking license expirations:', error);
    logger.error('Error checking license expirations', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

checkExpirations().then(() => {
  console.log('\n✅ License expiration check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
