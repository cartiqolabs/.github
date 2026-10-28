'use strict';

// The HTTP API. Every image is one address:
//
//   GET  /banner.png?motto=Honest%20by%20default&theme=light
//   GET  /logo.svg?type=icon&background=solid
//   GET  /rank-card.png?username=Nova&level=12&rank=3&xp=1250&xpNeeded=2000
//   POST /rank-card.png   with the same options as JSON
//
// It works on its own (createServer) or inside Express, Fastify or a plain
// Node server (createHandler).
const http = require('node:http');
const { BrandError, TYPES, FORMATS } = require('./options.js');
const { DISCORD } = require('./images.js');
const pkg = require('../package.json');

const CONTENT_TYPES = { png: 'image/png', svg: 'image/svg+xml; charset=utf-8', gif: 'image/gif', apng: 'image/apng' };
const ROUTE = /^\/(banner|logo|rank-card)\.(png|svg|gif|apng)$/;

function sendJson(res, status, body, cors) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(text) }, cors ? { 'access-control-allow-origin': '*' } : {}));
  res.end(text);
}

function readBody(req, limit) {
  return new Promise(function (resolve, reject) {
    if (req.body !== undefined) { resolve(req.body); return; } // already read by Express or Fastify
    const chunks = [];
    let size = 0;
    req.on('data', function (c) {
      size += c.length;
      if (size > limit) { reject(new BrandError('That request is too big.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) { resolve({}); return; }
      try { resolve(JSON.parse(text)); } catch (e) { reject(new BrandError('The request body should be JSON.')); }
    });
    req.on('error', reject);
  });
}

// settings:
//   basePath         where the API is mounted, e.g. '/brand' (default '')
//   allowImageHosts  hosts avatars and background images may come from
//                    (default Discord's CDN), or '*' for any host
//   cacheSeconds     how long browsers and CDNs may keep an image (default a day)
//   cors             let any website load the images (default true)
function createHandler(settings) {
  const s = Object.assign({ basePath: '', allowImageHosts: DISCORD, cacheSeconds: 86400, cors: true, maxBodyBytes: 1024 * 1024 }, settings);
  const brand = require('../index.js');
  const base = String(s.basePath || '').replace(/\/+$/, '');

  async function handle(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = url.pathname;
    if (base) {
      if (path !== base && !path.startsWith(base + '/')) return false;
      path = path.slice(base.length) || '/';
    }
    if (req.method === 'OPTIONS' && s.cors) {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' });
      res.end();
      return true;
    }
    if (path === '/' || path === '') {
      sendJson(res, 200, {
        name: pkg.name,
        version: pkg.version,
        docs: 'https://github.com/cartiqolabs/.github/tree/main/packages/brand#readme',
        images: ['banner', 'logo', 'rank-card'].map(function (kind) {
          return { path: base + '/' + kind + '.{' + FORMATS.join(',') + '}', options: Object.keys(TYPES[kind]).filter(function (k) { return k !== 'format'; }) };
        }),
        imageHosts: s.allowImageHosts,
      }, s.cors);
      return true;
    }
    if (path === '/health') { sendJson(res, 200, { ok: true }, s.cors); return true; }

    const m = ROUTE.exec(path);
    if (!m) return false;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use GET or POST.' }, s.cors);
      return true;
    }
    const input = {};
    url.searchParams.forEach(function (v, k) { input[k] = v; });
    if (req.method === 'POST') {
      const body = await readBody(req, s.maxBodyBytes);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BrandError('The request body should be a JSON object of options.');
      Object.assign(input, body);
    }
    input.format = m[2];

    const out = await brand.make(m[1], input, { strict: true, allowHosts: s.allowImageHosts, allowFiles: false });
    const body = typeof out === 'string' ? Buffer.from(out, 'utf8') : out;
    const headers = {
      'content-type': CONTENT_TYPES[m[2]],
      'content-length': body.length,
      'cache-control': 'public, max-age=' + s.cacheSeconds,
    };
    if (s.cors) headers['access-control-allow-origin'] = '*';
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  }

  return function cartiqoBrand(req, res, next) {
    handle(req, res).then(function (handled) {
      if (handled) return;
      if (typeof next === 'function') next();
      else sendJson(res, 404, { error: 'Nothing here. Try /banner.png, /logo.png or /rank-card.png.' }, s.cors);
    }).catch(function (err) {
      if (res.headersSent) { res.end(); return; }
      if (err instanceof BrandError) { sendJson(res, 400, { error: err.message }, s.cors); return; }
      console.error('[cartiqo-brand]', err);
      sendJson(res, 500, { error: 'Something went wrong drawing that image.' }, s.cors);
    });
  };
}

function createServer(settings) {
  const handler = createHandler(settings);
  return http.createServer(function (req, res) { handler(req, res); });
}

module.exports = { createHandler: createHandler, createServer: createServer };
