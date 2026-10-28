'use strict';

// The renderer and encoders live in docs/ (the banner maker website serves
// them from there). This copies them into lib/. With --check it only checks
// the copies are current, and fails if not; `npm pack` and `npm publish` run that.
const fs = require('node:fs');
const path = require('node:path');

const docs = path.join(__dirname, '..', '..', '..', 'docs');
const lib = path.join(__dirname, '..', 'lib');
const files = { 'banner.js': 'render.js', 'encoders.js': 'encoders.js' };
const check = process.argv.includes('--check');
let stale = [];

Object.keys(files).forEach(function (from) {
  const source = fs.readFileSync(path.join(docs, from), 'utf8');
  const target = path.join(lib, files[from]);
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (current === source) return;
  if (check) stale.push(files[from]);
  else { fs.writeFileSync(target, source); console.log('Updated lib/' + files[from] + ' from docs/' + from); }
});

if (stale.length) {
  console.error('lib/' + stale.join(' and lib/') + ' differ from docs/. Run npm run sync.');
  process.exit(1);
}
