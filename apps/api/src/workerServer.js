import logger from './utils/logger.js';
import { startWorkerProcess } from './bootstrap/worker.js';

startWorkerProcess().catch((err) => {
  logger.error('Worker server crashed on startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

