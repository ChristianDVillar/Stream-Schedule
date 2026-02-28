import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { sequelize } from './models/index.js';
import { startWorker } from './services/publicationWorker.js';
import { startDiscordSyncWorker } from './services/discordQueueService.js';
import { startDiscordGateway } from './services/discordGatewayService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno igual que en app.js
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

async function initDatabase() {
  try {
    await sequelize.authenticate();
    const dbType = process.env.DATABASE_URL ? 'PostgreSQL (Supabase)' : 'SQLite';
    logger.info('Worker DB connection established', { dbType, environment: nodeEnv });
  } catch (err) {
    logger.error('Worker database initialization failed', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

async function startWorkerProcess() {
  await initDatabase();

  // Worker de publicación (cola principal)
  if (process.env.ENABLE_PUBLICATION_WORKER !== 'false') {
    await startWorker();
  } else {
    logger.warn('Publication worker disabled by ENABLE_PUBLICATION_WORKER=false');
  }

  // Discord: worker de sync y Gateway (eventos programados)
  startDiscordSyncWorker().catch((err) =>
    logger.debug('Discord sync worker not started', { error: err.message })
  );
  startDiscordGateway().catch((err) =>
    logger.debug('Discord Gateway not started', { error: err.message })
  );

  logger.info('Worker server started', { environment: nodeEnv });
}

startWorkerProcess().catch((err) => {
  logger.error('Worker server crashed on startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

