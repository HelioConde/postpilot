const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const missing = [];

function normalizeLocalRef(value) {
  if (!value) return null;
  const ref = value.trim();
  if (
    ref.startsWith('#') ||
    ref.startsWith('http://') ||
    ref.startsWith('https://') ||
    ref.startsWith('mailto:') ||
    ref.startsWith('tel:') ||
    ref.startsWith('data:') ||
    ref.startsWith('javascript:')
  ) return null;

  const clean = ref.split('#')[0].split('?')[0];
  if (!clean || clean === './' || clean === '/') return 'index.html';
  if (clean.endsWith('/')) return path.join(clean, 'index.html');
  return clean.replace(/^\.\//, '');
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map(match => match[1]);

  for (const raw of refs) {
    const local = normalizeLocalRef(raw);
    if (!local) continue;

    const target = path.resolve(root, local);
    if (!target.startsWith(root) || !fs.existsSync(target)) {
      missing.push({ file, raw, expected: local });
    }
  }
}

if (missing.length) {
  console.error('Broken internal references:');
  missing.forEach(item => console.error(`- ${item.file}: ${item.raw} -> ${item.expected}`));
  process.exit(1);
}

console.log(`Internal link check passed for ${htmlFiles.length} HTML files.`);
