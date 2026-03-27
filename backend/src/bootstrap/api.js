import { initServer } from '../app.js';

export async function startApiProcess() {
  return initServer();
}

export default startApiProcess;
