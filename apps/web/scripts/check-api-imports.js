const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const legacyGlobalApi = path.join(frontendRoot, 'src', 'api.js');

if (fs.existsSync(legacyGlobalApi)) {
  console.error('Architecture check failed: legacy file must not exist: src/api.js');
  console.error('  Use shared/api/client.js for transport and features/*/api.js for domain calls.');
  process.exit(1);
}

const root = path.join(frontendRoot, 'src');
const scanDirs = [root];

const forbiddenImportPatterns = [
  /from\s+['"]((\.\.\/)+api|(\.\/)+api)['"]/,
  /from\s+['"]((\.\.\/)+api\.js|(\.\/)+api\.js)['"]/,
  /from\s+['"][^'"]*\/src\/api(\.js)?['"]/,
];
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !full.endsWith('.js')) continue;
    if (full.endsWith('.test.js')) continue;
    const content = fs.readFileSync(full, 'utf8');
    const hasForbiddenImport = forbiddenImportPatterns.some((pattern) => pattern.test(content));
    if (hasForbiddenImport) {
      const rel = path.relative(frontendRoot, full).replace(/\\/g, '/');
      if (rel === 'src/shared/api/client.js') continue;
      violations.push(rel);
    }
  }
}

scanDirs.forEach(walk);

if (violations.length > 0) {
  console.error('Architecture check failed: direct imports from legacy src/api are not allowed.');
  violations.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log('Architecture check OK: no legacy src/api.js and no forbidden api imports in src/.');
