// Rebuilds docs/vendor/lucide.js, the icons the Icon tab draws, from a
// lucide-static package. The site has no build step, so the result is
// committed and served as it is.
//
//   npm pack lucide-static@1.39.0 && tar xzf lucide-static-1.39.0.tgz
//   node scripts/vendor-lucide.mjs ./package
//
// Lucide is ISC licensed (some icons MIT, from Feather); its licence is copied
// next to the data.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = process.argv[2];
if (!pkgDir) {
  console.error('Usage: node scripts/vendor-lucide.mjs <path to an unpacked lucide-static package>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'vendor');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const nodes = JSON.parse(readFileSync(join(pkgDir, 'icon-nodes.json'), 'utf8'));
const tags = JSON.parse(readFileSync(join(pkgDir, 'tags.json'), 'utf8'));

const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
// Each icon is kept as the markup inside Lucide's 24 × 24 <svg>.
function markup(list) {
  return list.map(([tag, a]) => '<' + tag + Object.keys(a).filter((k) => k !== 'key')
    .map((k) => ' ' + k + '="' + attr(a[k]) + '"').join('') + '/>').join('');
}

const icons = Object.keys(nodes).sort().map((name) => [name, markup(nodes[name]), (tags[name] || []).join(' ')]);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'lucide.js'),
  '/*! Lucide ' + pkg.version + ' | ISC License | https://lucide.dev | see lucide-LICENSE.txt */\n' +
  'window.CartiqoLucide = {version:' + JSON.stringify(pkg.version) + ',icons:' + JSON.stringify(icons) + '};\n');
copyFileSync(join(pkgDir, 'LICENSE'), join(out, 'lucide-LICENSE.txt'));
console.log('Wrote ' + icons.length + ' icons from lucide-static ' + pkg.version + '.');
