import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');
const violations = [];

const staticImportPattern = /from\s+['"][^'"]*models\/index\.js['"]/;
const dynamicImportPattern = /import\(\s*['"][^'"]*models\/index\.js['"]\s*\)/;
const coreBarrelImportPattern = /from\s+['"][^'"]*modules\/core\/infrastructure\/models\.js['"]/;

function isAllowed(relPath) {
  if (relPath === 'models/index.js') return true;
  if (relPath === 'platform/db/index.js') return true;
  if (/^modules\/[^/]+\/infrastructure\/models\.js$/.test(relPath)) return true;
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !fullPath.endsWith('.js')) continue;

    const relPath = path.relative(srcRoot, fullPath).replace(/\\/g, '/');
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasForbiddenModelImport =
      staticImportPattern.test(content) || dynamicImportPattern.test(content);
    const usesCoreCatchAllBarrel = coreBarrelImportPattern.test(content);
    if ((hasForbiddenModelImport && !isAllowed(relPath)) || usesCoreCatchAllBarrel) {
      violations.push(relPath);
    }
  }
}

walk(srcRoot);

if (violations.length > 0) {
  console.error('Architecture check failed: direct imports from models/index.js are forbidden outside infrastructure.');
  for (const file of violations) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log('Architecture check OK: no forbidden direct models/index.js imports.');

