#!/usr/bin/env node
'use strict';

// The command line:
//
//   npx cartiqo-brand banner --motto "Honest by default" -o banner.png
//   npx cartiqo-brand rank-card --username Nova --level 12 --xp 1250 --xp-needed 2000
//   npx cartiqo-brand serve --port 3000
const fs = require('node:fs');
const path = require('node:path');
const brand = require('..');
const { TYPES } = require('../lib/options.js');
const pkg = require('../package.json');

const HELP = `cartiqo-brand ${pkg.version}: CARTIQO banners, logos and rank cards

Make an image:
  cartiqo-brand banner    [options] [-o file]
  cartiqo-brand logo      [options] [-o file]
  cartiqo-brand rank-card [options] [-o file]

Run the HTTP API:
  cartiqo-brand serve [--port 3000] [--host 0.0.0.0] [--base-path /brand]
                      [--allow-image-host cdn.example.com ...] [--any-image-host]

Other:
  cartiqo-brand options <banner|logo|rank-card>   list what can be set
  cartiqo-brand presets                           list banner sizes
  cartiqo-brand --help | --version

Options are written --like-this or --like-this=value. The file name picks the
format (.png, .svg or .gif); use --format apng for an animated PNG.

Examples:
  cartiqo-brand banner --motto "Honest by default" --theme light -o banner.png
  cartiqo-brand banner --preset x --animate draw -o header.gif
  cartiqo-brand logo --type icon --background solid --size 512 -o icon.png
  cartiqo-brand rank-card --username Nova --level 12 --rank 3 --xp 1250 --xp-needed 2000 \\
                          --avatar ./nova.png -o rank.png

Guide: https://github.com/cartiqolabs/.github/tree/main/packages/brand#readme`;

function camel(s) {
  return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
}

// --key value, --key=value, --flag, --no-flag. Repeated keys become lists.
function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') { out.out = argv[++i]; continue; }
    if (!a.startsWith('--')) { out._.push(a); continue; }
    let key = a.slice(2);
    let value;
    const eq = key.indexOf('=');
    if (eq >= 0) { value = key.slice(eq + 1); key = key.slice(0, eq); }
    else if (key.startsWith('no-')) { key = key.slice(3); value = 'false'; }
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && argv[i + 1] !== '-o') value = argv[++i];
    else value = 'true';
    key = camel(key);
    if (out[key] !== undefined) out[key] = [].concat(out[key], value);
    else out[key] = value;
  }
  return out;
}

function fail(message) {
  console.error('cartiqo-brand: ' + message);
  process.exit(1);
}

function size(bytes) {
  return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : Math.round(bytes / 1048576 * 10) / 10 + ' MB';
}

async function main() {
  const args = parse(process.argv.slice(2));
  const command = args._[0];
  if (args.version) { console.log(pkg.version); return; }
  if (!command || args.help || command === 'help') { console.log(HELP); return; }

  if (command === 'presets') {
    require('../lib/render.js').SIZES.forEach(function (s) { console.log(s.id.padEnd(18) + s.width + ' × ' + s.height + '  ' + s.name); });
    return;
  }
  if (command === 'options') {
    const kind = args._[1];
    if (!TYPES[kind]) fail('say which: options banner, options logo or options rank-card');
    Object.keys(TYPES[kind]).forEach(function (k) { console.log('--' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }).padEnd(24) + TYPES[kind][k]); });
    return;
  }

  if (command === 'serve') {
    const port = Number(args.port || process.env.PORT || 3000);
    const host = args.host || '0.0.0.0';
    const hosts = args.anyImageHost === 'true' ? '*' : args.allowImageHost ? [].concat(args.allowImageHost) : undefined;
    const server = brand.createServer({ basePath: args.basePath || '', allowImageHosts: hosts });
    server.listen(port, host, function () {
      console.log('cartiqo-brand API on http://' + (host === '0.0.0.0' ? 'localhost' : host) + ':' + port + (args.basePath || '') + '/');
      console.log('Try http://localhost:' + port + (args.basePath || '') + '/banner.png');
    });
    return;
  }

  if (!TYPES[command]) fail('"' + command + '" is not something this makes. Run cartiqo-brand --help.');
  const options = Object.assign({}, args);
  delete options._;
  const out = options.out;
  delete options.out;
  if (!options.format) {
    const ext = out ? path.extname(out).slice(1).toLowerCase() : 'png';
    options.format = ext === 'apng' ? 'apng' : ext || 'png';
  }
  const file = out || command + '.' + (options.format === 'apng' ? 'png' : options.format);
  try {
    const result = await brand.make(command, options, { strict: true });
    fs.writeFileSync(file, result);
    console.log('Saved ' + file + ' (' + size(Buffer.byteLength(result)) + ').');
  } catch (err) {
    fail(err instanceof brand.BrandError ? err.message : String(err && err.stack || err));
  }
}

main();
