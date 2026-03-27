import logger from './utils/logger.js';
import { startSchedulerProcess } from './bootstrap/scheduler.js';

startSchedulerProcess().catch((err) => {
  logger.error('Scheduler server crashed on startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

