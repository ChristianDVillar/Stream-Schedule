import logger from './utils/logger.js';
import { app } from './app.js';
import { startApiProcess } from './bootstrap/api.js';

/**
 * API entrypoint.
 * - Inicializa base de datos.
 * - Arranca sólo el servidor HTTP (sin scheduler ni workers).
 */

async function startApi() {
  try {
    await startApiProcess();
  } catch (err) {
    logger.error('API server failed to start', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startApi();

export default app;

