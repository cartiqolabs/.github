'use strict';

// What each maker accepts, how text from a URL or the command line is read,
// and how package options become renderer options.
const R = require('./render.js');

// A mistake in what was asked for. Its message is written for people, and
// the HTTP API sends it back with a 400.
class BrandError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BrandError';
  }
}

const FORMATS = ['png', 'svg', 'gif', 'apng'];
const MAX_PIXELS = 40e6; // a PNG of up to 40 megapixels
const PRESETS = {};
R.SIZES.forEach(function (s) { PRESETS[s.id] = s; });

// Options every maker takes, on top of its own.
const SHARED = { format: 'string', scale: 'number', fps: 'number' };

// The renderer's own options, typed from its defaults. Options that are only
// used inside the renderer are left out.
function typesFrom(defaults, leaveOut, extra) {
  const types = {};
  Object.keys(defaults).forEach(function (k) {
    if (leaveOut.indexOf(k) >= 0) return;
    const v = defaults[k];
    types[k] = typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string';
  });
  return Object.assign(types, SHARED, extra);
}

const TYPES = {
  banner: typesFrom(R.DEFAULTS, ['measure', 'safe', 'frame', 'scale', 'loop'], {
    preset: 'string', contentSize: 'number', image: 'image', stagger: 'number', bg: 'string', ink: 'string', bg2: 'string', loop: 'boolean',
  }),
  logo: typesFrom(R.LOGO_DEFAULTS, ['measure', 'frame', 'loop'], {
    stagger: 'number', bg: 'string', ink: 'string', bg2: 'string', loop: 'boolean',
  }),
  'rank-card': typesFrom(R.RANK_DEFAULTS, ['measure', 'frame', 'scale', 'loop'], {
    avatar: 'image', image: 'image', bg: 'string', ink: 'string', bg2: 'string', loop: 'boolean',
  }),
};

function readValue(key, type, value) {
  if (value == null) return value;
  if (type === 'number') {
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    if (String(value).trim() === '' || !isFinite(n)) throw new BrandError('"' + key + '" should be a number, not "' + value + '".');
    return n;
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const s = String(value).trim().toLowerCase();
    if (s === '' || s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
    if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
    throw new BrandError('"' + key + '" should be true or false, not "' + value + '".');
  }
  if (type === 'image') return value;
  return String(value);
}

// Checks and types the options for a maker. With `strict`, options it does
// not know are an error (handy for typos in a URL); otherwise they are ignored,
// so a database row can be passed straight in.
function normalise(kind, input, strict) {
  const types = TYPES[kind];
  const out = {};
  Object.keys(input || {}).forEach(function (key) {
    if (!types[key]) {
      if (strict) throw new BrandError('There is no "' + key + '" option for ' + kind + 's. Try one of: ' + Object.keys(types).join(', ') + '.');
      return;
    }
    out[key] = readValue(key, types[key], input[key]);
  });

  const format = String(out.format || 'png').toLowerCase();
  if (FORMATS.indexOf(format) < 0) throw new BrandError('"' + out.format + '" is not a format this makes. Use png, svg, gif or apng.');
  const scale = out.scale == null ? 1 : out.scale;
  if (!(scale >= 0.25 && scale <= 4)) throw new BrandError('"scale" should be between 0.25 and 4.');
  const fps = out.fps == null ? 25 : out.fps;
  if (!(fps >= 1 && fps <= 50)) throw new BrandError('"fps" should be between 1 and 50.');

  // Package options that the renderer names differently.
  const render = Object.assign({}, out);
  delete render.format;
  delete render.scale;
  delete render.fps;
  if (kind === 'banner') {
    delete render.preset;
    delete render.contentSize;
    if (out.preset != null) {
      const p = PRESETS[out.preset];
      if (!p) throw new BrandError('There is no "' + out.preset + '" preset. Try one of: ' + Object.keys(PRESETS).join(', ') + '.');
      if (render.width == null) render.width = p.width;
      if (render.height == null) render.height = p.height;
      if (p.safe && render.width === p.width && render.height === p.height) render.safe = p.safe;
    }
    if (out.contentSize != null) render.scale = out.contentSize;
    ['width', 'height'].forEach(function (k) {
      if (render[k] != null && !(render[k] >= 16 && render[k] <= 6000)) throw new BrandError('"' + k + '" should be between 16 and 6000 pixels.');
    });
  }
  if (kind === 'logo' && render.size != null && !(render.size >= 16 && render.size <= 4096)) {
    throw new BrandError('"size" should be between 16 and 4096 pixels.');
  }
  return { render: render, format: format, scale: scale, fps: fps };
}

// The pixel size an SVG says it is.
function sizeOf(svg) {
  const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function checkPixels(svg, scale) {
  const s = sizeOf(svg);
  if (s.width * s.height * scale * scale > MAX_PIXELS) {
    throw new BrandError('That image would be ' + Math.round(s.width * scale) + ' × ' + Math.round(s.height * scale) + ' pixels, which is more than this draws. Use a smaller size or scale.');
  }
  return s;
}

module.exports = { BrandError: BrandError, normalise: normalise, sizeOf: sizeOf, checkPixels: checkPixels, TYPES: TYPES, PRESETS: PRESETS, FORMATS: FORMATS };
