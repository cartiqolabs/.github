'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const brand = require('..');

const PNG = [0x89, 0x50, 0x4e, 0x47];
const pngSize = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const isPng = (b) => PNG.every((v, i) => b[i] === v);
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const webp = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA=', 'base64');

test('the renderer copies in lib/ match docs/', () => {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'sync.js'), '--check']);
});

test('banner: the default SVG is the profile banner', async () => {
  const svg = await brand.banner({ format: 'svg' });
  const profile = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'profile', 'assets', 'banner-dark.svg'), 'utf8');
  const flat = (s) => s.replace(/\s+/g, ' ').trim();
  assert.equal(flat(svg), flat(profile));
});

test('banner: PNG sizes, presets and scale', async () => {
  const png = await brand.banner();
  assert.ok(isPng(png));
  assert.deepEqual(pngSize(png), [1280, 360]);
  assert.deepEqual(pngSize(await brand.banner({ scale: 2 })), [2560, 720]);
  assert.deepEqual(pngSize(await brand.banner({ preset: 'discord-embed' })), [1200, 600]);
  assert.deepEqual(pngSize(await brand.banner({ width: 800, height: 200 })), [800, 200]);
});

test('banner: mistakes get clear errors', async () => {
  await assert.rejects(brand.banner({ preset: 'nope' }), /There is no "nope" preset/);
  await assert.rejects(brand.banner({ format: 'bmp' }), /not a format/);
  await assert.rejects(brand.banner({ width: 99999 }), /between 16 and 6000/);
  await assert.rejects(brand.banner({ scale: 9 }), /between 0.25 and 4/);
  await assert.rejects(brand.make('banner', { moto: 'x' }, { strict: true }), /There is no "moto" option/);
  // Without strict, unknown options are ignored, so a database row can go straight in.
  assert.ok(isPng(await brand.banner({ moto: 'x' })));
});

test('logo: icon PNG and wordmark SVG', async () => {
  assert.deepEqual(pngSize(await brand.logo({ type: 'icon', background: 'solid', size: 512 })), [512, 512]);
  const svg = await brand.logo({ format: 'svg' });
  assert.match(svg, /^<svg/);
});

test('rank card: text is escaped, numbers shown, rank optional', async () => {
  const svg = await brand.rankCard({ username: '<b>Nova & co</b>', level: 12, rank: 3, xp: 1250, xpNeeded: 2000, format: 'svg' });
  assert.match(svg, /&lt;b&gt;Nova &amp; co&lt;\/b&gt;/);
  assert.doesNotMatch(svg, /<b>/);
  assert.match(svg, /1,250 \/ 2,000 XP/);
  assert.match(svg, /750 XP to level 13/);
  assert.match(svg, />RANK</);
  const noRank = await brand.rankCard({ rank: 0, format: 'svg' });
  assert.doesNotMatch(noRank, />RANK</);
  const full = await brand.rankCard({ xp: 500, xpNeeded: 100, format: 'svg' });
  assert.match(full, /Ready for level 2/);
});

test('rank card: PNG size, pictures and WebP', async () => {
  const png = await brand.rankCard({ avatar: tinyPng, scale: 2 });
  assert.deepEqual(pngSize(png), [1920, 600]);
  const svg = await brand.rankCard({ avatar: 'data:image/png;base64,' + tinyPng.toString('base64'), format: 'svg' });
  assert.match(svg, /<image href="data:image\/png;base64,/);
  await assert.rejects(brand.rankCard({ avatar: webp }), /WebP images cannot be drawn/);
  await assert.rejects(brand.rankCard({ avatar: path.join(os.tmpdir(), 'no-such-avatar.png') }), /There is no picture/);
});

test('animations: GIF loops, animated PNG has frames', async () => {
  const gif = await brand.banner({ animate: 'draw', format: 'gif', duration: 2 });
  assert.equal(gif.subarray(0, 6).toString('latin1'), 'GIF89a');
  assert.ok(gif.includes(Buffer.from('NETSCAPE2.0')));
  const once = await brand.banner({ animate: 'draw', format: 'gif', duration: 2, loop: false });
  assert.ok(!once.includes(Buffer.from('NETSCAPE2.0')));
  const apng = await brand.rankCard({ animate: 'fill', format: 'apng', duration: 2 });
  assert.ok(isPng(apng));
  assert.ok(apng.includes(Buffer.from('acTL')));
  // A still GIF when nothing moves.
  const still = await brand.logo({ type: 'icon', background: 'solid', format: 'gif' });
  assert.equal(still.subarray(0, 6).toString('latin1'), 'GIF89a');
});

test('pictures: Discord links are fetched as PNG, other hosts can be refused', async () => {
  const { loadImage } = require('../lib/images.js');
  const real = global.fetch;
  const asked = [];
  global.fetch = async (url) => {
    asked.push(String(url));
    return new Response(tinyPng, { status: 200, headers: { 'content-type': 'image/png' } });
  };
  try {
    const url = await loadImage('https://cdn.discordapp.com/avatars/1/abc.webp?size=128', { allowHosts: ['cdn.discordapp.com'] });
    assert.match(url, /^data:image\/png;base64,/);
    assert.equal(asked[0], 'https://cdn.discordapp.com/avatars/1/abc.png?size=128');
    await assert.rejects(loadImage('https://example.com/a.png', { allowHosts: ['cdn.discordapp.com'] }), /not allowed here/);
    await assert.rejects(loadImage('/etc/passwd', { allowFiles: false }), /should be a web address/);
  } finally {
    global.fetch = real;
  }
});

test('HTTP API: images, errors and the index', async () => {
  const server = brand.createServer({ basePath: '/brand' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/brand';
  try {
    let res = await fetch(base + '/banner.png?motto=Hello&theme=light');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.match(res.headers.get('cache-control'), /max-age=86400/);
    assert.ok(isPng(Buffer.from(await res.arrayBuffer())));

    res = await fetch(base + '/rank-card.svg?username=Nova&level=12&xp=10&xpNeeded=100');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Nova/);

    res = await fetch(base + '/rank-card.png', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'Nova', level: 3 }) });
    assert.equal(res.status, 200);

    res = await fetch(base + '/banner.png?moto=x');
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /There is no "moto" option/);

    res = await fetch(base + '/rank-card.png?avatar=https://example.com/a.png');
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /not allowed here/);

    res = await fetch(base + '/rank-card.png?avatar=C:/Windows/win.ini');
    assert.equal(res.status, 400);

    res = await fetch(base + '/');
    const index = await res.json();
    assert.equal(index.name, 'cartiqo-brand');
    assert.equal(index.images.length, 3);

    res = await fetch(base + '/nope');
    assert.equal(res.status, 404);
    res = await fetch('http://127.0.0.1:' + server.address().port + '/banner.png');
    assert.equal(res.status, 404, 'outside the base path');
  } finally {
    server.close();
  }
});

test('HTTP API: inside another server, unknown addresses go to next()', async () => {
  const handler = brand.createHandler();
  let nexted = false;
  await new Promise((resolve) => {
    const res = { headersSent: false, writeHead() { throw new Error('should not answer'); }, end() {} };
    handler({ url: '/somewhere-else', method: 'GET' }, res, () => { nexted = true; resolve(); });
  });
  assert.ok(nexted);
});

test('command line: makes a file, explains mistakes', () => {
  const bin = path.join(__dirname, '..', 'bin', 'cartiqo-brand.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cartiqo-brand-'));
  const out = path.join(dir, 'rank.png');
  const ok = spawnSync(process.execPath, [bin, 'rank-card', '--username', 'Nova', '--level', '12', '--xp-needed', '2000', '-o', out], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Saved .*rank\.png/);
  assert.deepEqual(pngSize(fs.readFileSync(out)), [960, 300]);

  const svg = path.join(dir, 'banner.svg');
  assert.equal(spawnSync(process.execPath, [bin, 'banner', '--theme', 'light', '-o', svg]).status, 0);
  assert.match(fs.readFileSync(svg, 'utf8'), /^<svg/);

  const bad = spawnSync(process.execPath, [bin, 'banner', '--moto', 'x'], { encoding: 'utf8', cwd: dir });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /There is no "moto" option/);

  const help = spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /cartiqo-brand serve/);
});
