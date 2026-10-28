'use strict';

// Pictures (avatars, background images) given as a web address, a file, a
// Buffer or a data: URL become data: URLs the renderer can embed. PNG, JPEG,
// GIF and SVG work. WebP cannot be drawn, so Discord links are asked for as PNG.
const fs = require('node:fs/promises');
const { BrandError } = require('./options.js');

const MAX_BYTES = 8 * 1024 * 1024;
const DISCORD = ['cdn.discordapp.com', 'media.discordapp.net'];

function typeOf(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  const head = Buffer.from(bytes.subarray(0, 12)).toString('latin1');
  if (head.slice(0, 4) === 'RIFF' && head.slice(8, 12) === 'WEBP') {
    throw new BrandError('WebP images cannot be drawn. Use PNG, JPEG or GIF.');
  }
  const text = Buffer.from(bytes.subarray(0, 256)).toString('utf8').trim();
  if (/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text)) return 'image/svg+xml';
  throw new BrandError('That picture is not a PNG, JPEG, GIF or SVG.');
}

function dataUrl(bytes) {
  return 'data:' + typeOf(bytes) + ';base64,' + Buffer.from(bytes).toString('base64');
}

function hostAllowed(host, allowHosts) {
  if (!allowHosts || allowHosts === '*' || allowHosts.indexOf('*') >= 0) return true;
  return allowHosts.some(function (h) { return host === h || host.endsWith('.' + h); });
}

// Discord serves avatars as WebP unless asked otherwise; PNG works everywhere.
function discordPng(url) {
  if (DISCORD.indexOf(url.hostname) < 0) return url;
  url.pathname = url.pathname.replace(/\.webp$/i, '.png');
  url.searchParams.delete('format');
  if (!url.searchParams.has('size')) url.searchParams.set('size', '256');
  return url;
}

// `allowHosts`: null or '*' allows any web address, a list allows only those
// hosts (and their subdomains). `allowFiles` lets a plain string be a file path.
async function loadImage(source, settings) {
  const s = Object.assign({ allowHosts: null, allowFiles: true, timeout: 8000 }, settings);
  if (source == null || source === '') return null;
  if (source instanceof Uint8Array) return dataUrl(source);
  if (typeof source !== 'string') throw new BrandError('A picture should be a web address, a file path, a data: URL or a Buffer.');
  if (/^data:/i.test(source)) {
    const m = /^data:([^;,]+)?(;base64)?,(.*)$/is.exec(source);
    if (!m) throw new BrandError('That data: URL could not be read.');
    return dataUrl(m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8'));
  }
  if (/^https?:\/\//i.test(source)) {
    let url;
    try { url = new URL(source); } catch (e) { throw new BrandError('"' + source + '" is not a web address.'); }
    if (!hostAllowed(url.hostname, s.allowHosts)) {
      throw new BrandError('Pictures from ' + url.hostname + ' are not allowed here. This server takes pictures from: ' + s.allowHosts.join(', ') + '.');
    }
    url = discordPng(url);
    let res;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(s.timeout),
        // With a list of hosts, a redirect could lead somewhere else, so it is not followed.
        redirect: s.allowHosts && s.allowHosts !== '*' ? 'error' : 'follow',
        headers: { accept: 'image/png,image/jpeg,image/gif,image/svg+xml;q=0.8' },
      });
    } catch (e) {
      throw new BrandError('The picture at ' + url.hostname + ' could not be fetched.');
    }
    if (!res.ok) throw new BrandError('The picture at ' + url.hostname + ' answered with ' + res.status + '.');
    if (Number(res.headers.get('content-length')) > MAX_BYTES) throw new BrandError('That picture is over 8 MB.');
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new BrandError('That picture is over 8 MB.');
    return dataUrl(bytes);
  }
  if (!s.allowFiles) throw new BrandError('A picture should be a web address starting with https://.');
  let bytes;
  try { bytes = await fs.readFile(source); } catch (e) { throw new BrandError('There is no picture at "' + source + '".'); }
  if (bytes.length > MAX_BYTES) throw new BrandError('That picture is over 8 MB.');
  return dataUrl(bytes);
}

module.exports = { loadImage: loadImage, DISCORD: DISCORD };
