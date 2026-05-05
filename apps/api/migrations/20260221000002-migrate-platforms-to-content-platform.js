/**
 * Migration: Migrate existing Content.platforms JSONB to ContentPlatform table
 * This migration reads all Content records and creates ContentPlatform entries
 * for each platform in the platforms array.
 * 
 * IMPORTANT: Run this after creating ContentPlatform table and indexes.
 */

export default {
  async up(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;

    // Simple console.log for migration (logger might not be available in migration context)
    console.log('Starting migration of Content.platforms to ContentPlatform table...');

    // Get all Content records with platforms
    const contents = await queryInterface.sequelize.query(
      `SELECT id, platforms, status, "publishedAt", "discordEventId", "twitchSegmentId" 
       FROM "Contents" 
       WHERE platforms IS NOT NULL 
       AND platforms != '[]'::jsonb
       AND "deletedAt" IS NULL`,
      { type: QueryTypes.SELECT }
    );

    console.log(`Found ${contents.length} content items to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const content of contents) {
      try {
        const platforms = Array.isArray(content.platforms) 
          ? content.platforms 
          : (typeof content.platforms === 'string' ? JSON.parse(content.platforms) : []);

        if (!Array.isArray(platforms) || platforms.length === 0) {
          skipped++;
          continue;
        }

        // Determine status for each platform based on Content status
        let platformStatus = 'pending';
        if (content.status === 'published') {
          platformStatus = 'published';
        } else if (content.status === 'failed') {
          platformStatus = 'failed';
        } else if (content.status === 'retrying') {
          platformStatus = 'retrying';
        } else if (content.status === 'scheduled' || content.status === 'queued') {
          platformStatus = 'pending';
        }

        // Create ContentPlatform entry for each platform
        for (const platform of platforms) {
          if (!platform || typeof platform !== 'string') continue;

          const metadata = {};
          if (platform === 'discord' && content.discordEventId) {
            metadata.discordEventId = content.discordEventId;
          }
          if (platform === 'twitch' && content.twitchSegmentId) {
            metadata.twitchSegmentId = content.twitchSegmentId;
          }

          // Use INSERT ... ON CONFLICT to avoid duplicates if migration runs twice
          await queryInterface.sequelize.query(
            `INSERT INTO "ContentPlatforms" 
             ("contentId", "platform", "status", "publishedAt", "metadata", "createdAt", "updatedAt")
             VALUES (:contentId, :platform, :status, :publishedAt, :metadata::jsonb, NOW(), NOW())
             ON CONFLICT ("contentId", "platform") DO NOTHING`,
            {
              replacements: {
                contentId: content.id,
                platform: platform.toLowerCase(),
                status: platformStatus,
                publishedAt: content.publishedAt || null,
                metadata: JSON.stringify(metadata)
              },
              type: QueryTypes.INSERT
            }
          );
        }

        migrated++;
      } catch (error) {
        console.error(`Error migrating content ${content.id}:`, error.message);
        // Continue with next content
      }
    }

    console.log(`Migration complete: ${migrated} content items migrated, ${skipped} skipped`);
  },

  async down(queryInterface) {
    // Remove all ContentPlatform entries
    // Note: This does NOT restore platforms JSONB in Content (data loss)
    await queryInterface.sequelize.query('DELETE FROM "ContentPlatforms"');
  }
};
