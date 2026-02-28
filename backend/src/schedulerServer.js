import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { sequelize } from './models/index.js';
import { startScheduler } from './services/scheduler.js';
import { startSchedulerProducer } from './services/schedulerProducer.js';
import { runReconciliation } from './services/discordSyncService.js';
import { notifyDbSlow, notifyQueueProblems, checkRedisRecovery } from './services/alertService.js';
import { getQueueStats } from './services/publicationQueueService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Aseguramos que las variables de entorno se cargan igual que en app.js
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

async function initDatabase() {
  try {
    await sequelize.authenticate();
    const dbType = process.env.DATABASE_URL ? 'PostgreSQL (Supabase)' : 'SQLite';
    logger.info('Scheduler DB connection established', { dbType, environment: nodeEnv });
  } catch (err) {
    logger.error('Scheduler database initialization failed', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

async function startSchedulerProcess() {
  await initDatabase();

  // Scheduler Producer: sólo encola trabajos de publicación
  startSchedulerProducer();

  // Legacy scheduler opcional (conservado por compatibilidad)
  if (process.env.ENABLE_LEGACY_SCHEDULER !== 'false') {
    startScheduler();
  }

  // Reconciliación diaria de eventos de Discord
  const RECONCILIATION_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runReconciliation().catch((err) =>
      logger.warn('Discord reconciliation failed', { error: err.message })
    );
  }, RECONCILIATION_MS);
  runReconciliation().catch((err) =>
    logger.warn('Discord reconciliation (initial) failed', { error: err.message })
  );

  // Monitor operacional: Redis, latencia DB, colas → alertas
  const MONITOR_INTERVAL_MS = 60 * 1000;
  setInterval(async () => {
    try {
      await checkRedisRecovery();
    } catch (err) {
      logger.debug('Redis recovery check failed', { error: err.message });
    }
    try {
      const dbStart = Date.now();
      await sequelize.query('SELECT 1');
      const dbDuration = Date.now() - dbStart;
      await notifyDbSlow(dbDuration);
    } catch (err) {
      logger.warn('Operational monitor DB check failed', { error: err.message });
    }
    try {
      const stats = await getQueueStats();
      if (stats.enabled && !stats.error) {
        await notifyQueueProblems(stats.waiting ?? 0, stats.failed ?? 0);
      }
    } catch (err) {
      logger.warn('Operational monitor queue check failed', { error: err.message });
    }
  }, MONITOR_INTERVAL_MS);

  logger.info('Scheduler server started', { environment: nodeEnv });
}

startSchedulerProcess().catch((err) => {
  logger.error('Scheduler server crashed on startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

