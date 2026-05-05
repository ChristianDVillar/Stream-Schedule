import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

const requiredPaths = [
  'src/apiServer.js',
  'src/workerServer.js',
  'src/schedulerServer.js',
  'src/routes/cron.js',
  '../web/src/routes/AppRoutes.js',
];

function checkExists(relativePath) {
  const full = path.resolve(root, relativePath);
  return fs.existsSync(full);
}

function run() {
  const missing = requiredPaths.filter((p) => !checkExists(p));
  if (missing.length > 0) {
    console.error('Smoke baseline failed. Missing critical files:', missing);
    process.exit(1);
  }
  console.log('Smoke baseline OK. Critical startup/route files are present.');
}

run();

