'use strict';

// cartiqo-brand: CARTIQO banners, logos and rank cards.
//
//   const { banner, logo, rankCard } = require('cartiqo-brand');
//   const png = await banner({ motto: 'Honest by default' });
//
// Every maker returns a Promise: a Buffer for png, gif and apng, a string for svg.
const R = require('./lib/render.js');
const E = require('./lib/encoders.js');
const raster = require('./lib/raster.js');
const { loadImage } = require('./lib/images.js');
const { BrandError, normalise, sizeOf, checkPixels, PRESETS } = require('./lib/options.js');

const RENDER = { banner: R.render, logo: R.renderLogo, 'rank-card': R.renderRankCard };
// GIF and animated PNG frames are encoded in JavaScript, so they stay at or
// under 2560 × 1440 to keep the wait and the file sensible.
const MAX_ANIMATION_PIXELS = 2560 * 1440;

function buffer(u8) {
  return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
}

function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isAnimated(kind, r) {
  return kind === 'rank-card' ? r.animate === 'fill' : !!r.animate && r.animate !== 'none';
}

// The moments to draw for a GIF or animated PNG: the whole loop when it
// repeats, or up to the finished look when it plays once.
function moments(kind, r, fps) {
  if (!isAnimated(kind, r)) return [null];
  const seconds = r.duration == null ? 4 : r.duration;
  const out = [];
  if (r.loop !== false) {
    const n = Math.max(2, Math.round(seconds * fps));
    for (let i = 0; i < n; i++) out.push(i / n);
  } else {
    const span = kind === 'rank-card' ? R.ANIMATION_END : R.animationSpan(r.animate);
    const n = Math.max(2, Math.round(seconds * span * fps));
    for (let i = 0; i <= n; i++) out.push(i / n * span);
  }
  return out;
}

async function animation(kind, draw, r, o) {
  const times = moments(kind, r, o.fps);
  const svgs = times.map(function (t) { return t === null ? draw({ animate: 'none' }) : draw({ frame: t }); });
  const size = sizeOf(svgs[0]);
  const scale = Math.min(o.scale, Math.sqrt(MAX_ANIMATION_PIXELS / (size.width * size.height)));
  const delay = 1000 / o.fps;

  if (o.format === 'apng') {
    const first = raster.pixels(svgs[0], scale);
    const apng = E.createApng(first.width, first.height, { loop: r.loop !== false });
    await apng.addFrame(first.data, delay);
    for (let i = 1; i < svgs.length; i++) await apng.addFrame(raster.pixels(svgs[i], scale).data, delay);
    return buffer(await apng.finish());
  }

  // GIF: 255 colours picked from every fourth frame and the finished look.
  // Rank cards (with their round corners) and logos without a background keep
  // their see-through pixels; soft edges are blended onto the theme colour.
  // Only a logo without a background has pixels that turn see-through as it
  // plays, so only it needs whole frames.
  const wholeFrames = kind === 'logo' && (!r.background || r.background === 'none');
  const see = wholeFrames || (kind === 'rank-card' && (r.radius == null || r.radius > 0));
  const matte = rgbOf(R.resolveTheme(Object.assign({ theme: 'dark' }, r)).bg);
  const palette = new E.Palette(255);
  let first = null;
  const sample = svgs.filter(function (s, i) { return i % 4 === 0; });
  if (svgs.length > 1) sample.push(draw({ animate: 'none' }));
  sample.forEach(function (svg) {
    const p = raster.pixels(svg, scale);
    if (!first) first = p;
    palette.add(E.flatten(p.data, matte, see), Math.max(1, Math.floor(p.width * p.height / 250000)));
  });
  palette.build();
  const gif = E.createGif(first.width, first.height, { palette: palette, loop: r.loop !== false && svgs.length > 1, transparent: wholeFrames });
  svgs.forEach(function (svg) { gif.addFrame(E.flatten(raster.pixels(svg, scale).data, matte, see), delay); });
  return buffer(gif.finish());
}

// `context` is how the HTTP API and the command line ask for stricter checks.
async function make(kind, input, context) {
  const c = Object.assign({ strict: false, allowHosts: null, allowFiles: true }, context);
  const o = normalise(kind, input || {}, c.strict);
  const r = o.render;
  const settings = { allowHosts: c.allowHosts, allowFiles: c.allowFiles };
  if (r.image != null) r.image = await loadImage(r.image, settings);
  if (r.avatar != null) r.avatar = await loadImage(r.avatar, settings);
  if (r.image && kind === 'banner' && r.fill == null) r.fill = 'image';
  if (r.image && kind === 'rank-card' && r.fill == null) r.fill = 'image';
  const draw = function (extra) { return RENDER[kind](Object.assign({}, r, extra)); };

  if (o.format === 'svg') return draw();
  if (o.format === 'png') {
    const svg = draw({ animate: 'none' });
    checkPixels(svg, o.scale);
    return raster.png(svg, o.scale);
  }
  return animation(kind, draw, r, o);
}

const api = {
  banner: function (options) { return make('banner', options); },
  logo: function (options) { return make('logo', options); },
  rankCard: function (options) { return make('rank-card', options); },
  make: make,
  BrandError: BrandError,
  // What the options can be.
  presets: Object.keys(PRESETS),
  themes: Object.keys(R.THEMES).concat('custom'),
  accents: Object.keys(R.ACCENTS),
  animations: R.ANIMATIONS,
  patterns: R.PATTERNS,
  statuses: R.STATUSES,
  formats: ['png', 'svg', 'gif', 'apng'],
  // The renderer itself, for SVG without loading any pictures.
  render: { banner: R.render, logo: R.renderLogo, rankCard: R.renderRankCard },
};

// The HTTP API is loaded when first used, so plain makers stay light.
Object.defineProperty(api, 'createHandler', { enumerable: true, get: function () { return require('./lib/server.js').createHandler; } });
Object.defineProperty(api, 'createServer', { enumerable: true, get: function () { return require('./lib/server.js').createServer; } });

module.exports = api;
