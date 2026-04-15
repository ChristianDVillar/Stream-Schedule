/**
 * Compare leaf translation keys between en.json and es.json (exit 1 if mismatch).
 * Usage: node scripts/compare-locales.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'src', 'locales');

function flatKeys(obj, prefix = '') {
  const out = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k]) && obj[k] !== null) {
      out.push(...flatKeys(obj[k], p));
    } else {
      out.push(p);
    }
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(localesDir, 'es.json'), 'utf8'));

const enKeys = new Set(flatKeys(en));
const esKeys = new Set(flatKeys(es));
const onlyEn = [...enKeys].filter((k) => !esKeys.has(k)).sort();
const onlyEs = [...esKeys].filter((k) => !enKeys.has(k)).sort();

console.log(`en.json: ${enKeys.size} keys | es.json: ${esKeys.size} keys`);
if (onlyEn.length) {
  console.error('\nOnly in en.json:\n', onlyEn.join('\n'));
}
if (onlyEs.length) {
  console.error('\nOnly in es.json:\n', onlyEs.join('\n'));
}
if (onlyEn.length || onlyEs.length) {
  process.exit(1);
}
console.log('Locale key parity: OK');
