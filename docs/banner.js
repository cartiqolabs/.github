/* CARTIQO banner renderer.
 *
 * Draws the wordmark with the same strokes as profile/assets/banner-*.svg and
 * lays the banner out for any size. The banner maker (index.html) uses it in
 * the browser, and it runs in Node too:
 *
 *   const { render } = require('./banner.js');
 *   const svg = render({ width: 1500, height: 500, motto: 'Honest by default' });
 */
(function (root) {
  'use strict';

  const THEMES = {
    dark: { bg: '#0E1013', ink: '#F4F4F6', grid: 0.05, border: 0.1, corners: 0.28, overline: 0.45, rule: 0.16, motto: 0.68 },
    light: { bg: '#FFFAFA', ink: '#111113', grid: 0.055, border: 0.12, corners: 0.3, overline: 0.5, rule: 0.18, motto: 0.72 },
  };

  // Colours for the dot. Product accents come from the design system tokens,
  // which use a lighter step on dark backgrounds.
  const ACCENTS = {
    cartiqo: { name: 'CARTIQO', dark: '#7C5CFF', light: '#7C5CFF' },
    store: { name: 'Store', dark: '#F4F4F5', light: '#09090B' },
    chat: { name: 'Chat', dark: '#7D97FF', light: '#2C54F5' },
    club: { name: 'Club', dark: '#F5B544', light: '#A8500A' },
    mail: { name: 'Mail', dark: '#FF7A80', light: '#D4232F' },
    forum: { name: 'Forum', dark: '#4FD383', light: '#13803F' },
    wiki: { name: 'Wiki', dark: '#38C9E0', light: '#0B7287' },
    review: { name: 'Review', dark: '#B69BFF', light: '#7C3AED' },
    labs: { name: 'Labs', dark: '#C3C8D2', light: '#4F5563' },
  };

  // Sizes people ask for. `safe` is the part every device shows; the content
  // is fitted into it instead of the whole canvas.
  const SIZES = [
    { id: 'github', name: 'GitHub profile banner', width: 1280, height: 360 },
    { id: 'github-social', name: 'GitHub social preview', width: 1280, height: 640 },
    { id: 'og', name: 'Link preview (Open Graph)', width: 1200, height: 630 },
    { id: 'x', name: 'X header', width: 1500, height: 500 },
    { id: 'linkedin', name: 'LinkedIn banner', width: 1584, height: 396 },
    { id: 'youtube', name: 'YouTube channel banner', width: 2560, height: 1440, safe: { width: 1546, height: 423 } },
    { id: 'discord-server', name: 'Discord server banner', width: 960, height: 540 },
    { id: 'discord-invite', name: 'Discord invite background', width: 1920, height: 1080 },
    { id: 'discord-profile', name: 'Discord profile banner', width: 1200, height: 480 },
    { id: 'email', name: 'Email header', width: 1200, height: 400 },
    { id: 'square', name: 'Square post', width: 1080, height: 1080 },
    { id: 'story', name: 'Story', width: 1080, height: 1920 },
  ];

  const DEFAULTS = {
    width: 1280,
    height: 360,
    safe: null,
    wordmark: 'CARTIQO.',
    overline: 'One account · eight products',
    motto: 'Honest by default',
    theme: 'dark',
    accent: 'cartiqo',
    scale: 1,
    grid: true,
    corners: true,
    rule: true,
    border: true,
    measure: null,
  };

  const FONT = "Geist, Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

  // Everything is laid out on the 1280 x 360 GitHub banner and scaled from there.
  const BASE_W = 1280;
  const BASE_H = 360;
  const WORDMARK_SCALE = 2.15;
  const GAP = 8;

  // Glyphs are centre lines for a 4-unit round stroke on a 40-unit cap height
  // (y 7 to 47). w is the advance, l and r adjust the space either side.
  const O = 'M8 7 H20 A8 8 0 0 1 28 15 V39 A8 8 0 0 1 20 47 H8 A8 8 0 0 1 0 39 V15 A8 8 0 0 1 8 7 Z';
  const GLYPHS = {
    A: { w: 28, d: ['M0 47 L14 7 L28 47 M6.5 33 H21.5'] },
    B: { w: 27, l: 1, d: ['M0 47 V7 H15 A9 9 0 0 1 15 25 H0 M0 25 H16 A11 11 0 0 1 16 47 H0'] },
    C: { w: 25, d: ['M25 7 H8 A8 8 0 0 0 0 15 V39 A8 8 0 0 0 8 47 H25'] },
    D: { w: 26, l: 1, d: ['M0 7 H18 A8 8 0 0 1 26 15 V39 A8 8 0 0 1 18 47 H0 Z'] },
    E: { w: 24, l: 1, d: ['M24 7 H0 V47 H24 M0 27 H20'] },
    F: { w: 24, l: 1, d: ['M24 7 H0 V47 M0 27 H20'] },
    G: { w: 26, d: ['M26 7 H8 A8 8 0 0 0 0 15 V39 A8 8 0 0 0 8 47 H18 A8 8 0 0 0 26 39 V29 H15'] },
    H: { w: 26, l: 1, r: 1, d: ['M0 7 V47 M26 7 V47 M0 27 H26'] },
    I: { w: 0, l: 2, r: 2, d: ['M0 7 V47'] },
    J: { w: 20, d: ['M20 7 V39 A8 8 0 0 1 12 47 H8 A8 8 0 0 1 0 39 V36'] },
    K: { w: 26, l: 1, d: ['M0 7 V47 M24 7 L0 31 M9 22 L26 47'] },
    L: { w: 22, l: 1, r: -2, d: ['M0 7 V47 H22'] },
    M: { w: 32, l: 1, r: 1, d: ['M0 47 V7 L16 31 L32 7 V47'] },
    N: { w: 26, l: 1, r: 1, d: ['M0 47 V7 L26 47 V7'] },
    O: { w: 28, d: [O] },
    P: { w: 26, l: 1, d: ['M0 47 V7 H17 A9 9 0 0 1 17 25 H0'] },
    Q: { w: 28, d: [O, 'M17 33 L32 49'] },
    R: { w: 26, l: 1, d: ['M0 47 V7 H17 A9 9 0 0 1 17 25 H0 M9 25 L26 47'] },
    S: { w: 26, d: ['M25 7 H8 A8 8 0 0 0 0 15 V19 A8 8 0 0 0 8 27 H18 A8 8 0 0 1 26 35 V39 A8 8 0 0 1 18 47 H1'] },
    T: { w: 30, l: -1, r: -1, d: ['M0 7 H30 M15 7 V47'] },
    U: { w: 26, d: ['M0 7 V39 A8 8 0 0 0 8 47 H18 A8 8 0 0 0 26 39 V7'] },
    V: { w: 28, d: ['M0 7 L14 47 L28 7'] },
    W: { w: 40, d: ['M0 7 L10 47 L20 15 L30 47 L40 7'] },
    X: { w: 26, d: ['M0 7 L26 47 M26 7 L0 47'] },
    Y: { w: 26, d: ['M0 7 L13 27 L26 7 M13 27 V47'] },
    Z: { w: 26, d: ['M0 7 H26 L0 47 H26'] },
    0: { w: 24, d: ['M8 7 H16 A8 8 0 0 1 24 15 V39 A8 8 0 0 1 16 47 H8 A8 8 0 0 1 0 39 V15 A8 8 0 0 1 8 7 Z'] },
    1: { w: 12, d: ['M0 14 L12 7 V47'] },
    2: { w: 26, d: ['M0 15 A8 8 0 0 1 8 7 H18 A8 8 0 0 1 26 15 V19 A8 8 0 0 1 18 27 H8 A8 8 0 0 0 0 35 V47 H26'] },
    3: { w: 26, d: ['M0 7 H18 A8 8 0 0 1 26 15 V19 A8 8 0 0 1 18 27 H8 M18 27 A8 8 0 0 1 26 35 V39 A8 8 0 0 1 18 47 H0'] },
    4: { w: 26, d: ['M19 47 V7 L0 33 H26'] },
    5: { w: 26, d: ['M25 7 H0 V25 H18 A8 8 0 0 1 26 33 V39 A8 8 0 0 1 18 47 H0'] },
    6: { w: 26, d: ['M24 7 H8 A8 8 0 0 0 0 15 V39 A8 8 0 0 0 8 47 H18 A8 8 0 0 0 26 39 V33 A8 8 0 0 0 18 25 H0'] },
    7: { w: 26, d: ['M0 7 H26 L10 47'] },
    8: { w: 26, d: ['M10 7 H16 A8 8 0 0 1 24 15 V19 A8 8 0 0 1 16 27 H10 A8 8 0 0 1 2 19 V15 A8 8 0 0 1 10 7 Z', 'M8 27 H18 A8 8 0 0 1 26 35 V39 A8 8 0 0 1 18 47 H8 A8 8 0 0 1 0 39 V35 A8 8 0 0 1 8 27 Z'] },
    9: { w: 26, d: ['M2 47 H18 A8 8 0 0 0 26 39 V15 A8 8 0 0 0 18 7 H8 A8 8 0 0 0 0 15 V21 A8 8 0 0 0 8 29 H26'] },
    '-': { w: 14, d: ['M0 28 H14'] },
    '/': { w: 18, d: ['M0 47 L18 7'] },
    '!': { w: 0, l: 2, r: 2, d: ['M0 7 V35 M0 45 H0'] },
    "'": { w: 0, l: 2, r: 2, d: ['M0 7 V15'] },
    '.': { w: 8, dot: true },
    ' ': { w: 12, d: [] },
  };
  // Pairs that need a nudge. AR, RT and TI keep CARTIQO exactly as drawn.
  const KERN = { AR: -1, RT: -2, TI: 2 };

  function num(v) {
    return String(Math.round(v * 100) / 100);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Moves an absolute path (M, L, H, V, A, Z only) right by dx.
  function shift(d, dx) {
    return d.replace(/([MLHVAZ])([^MLHVAZ]*)/g, function (_, cmd, args) {
      const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
      for (let i = 0; i < n.length; i++) {
        if (((cmd === 'M' || cmd === 'L') && i % 2 === 0) || cmd === 'H' || (cmd === 'A' && i % 7 === 5)) n[i] += dx;
      }
      return cmd + n.map(num).join(' ') + ' ';
    }).trim();
  }

  function glyphsOf(text) {
    const list = Array.from(String(text || '').toUpperCase()).filter(function (c) { return GLYPHS[c]; });
    while (list[0] === ' ') list.shift();
    while (list[list.length - 1] === ' ') list.pop();
    return list;
  }

  // Places each glyph and returns the wordmark's box width in glyph units.
  function layoutWordmark(text) {
    const placed = [];
    let x = 7;
    let prev = null;
    glyphsOf(text).forEach(function (c) {
      const g = GLYPHS[c];
      if (prev) {
        const p = GLYPHS[prev];
        x += p.w + (p.r || 0) + GAP + (g.l || 0) + (KERN[prev + c] || 0);
      } else {
        x += g.l || 0;
      }
      placed.push({ c: c, x: x });
      prev = c;
    });
    const last = prev && GLYPHS[prev];
    return { placed: placed, width: last ? x + last.w + (last.r || 0) + GAP : 0 };
  }

  function wordmarkShapes(placed, accent, indent) {
    const out = [];
    placed.forEach(function (p) {
      const g = GLYPHS[p.c];
      if (g.dot) out.push(indent + '<circle cx="' + num(p.x + 4) + '" cy="43" r="4" fill="' + accent + '" stroke="none"/>');
      else g.d.forEach(function (d) { out.push(indent + '<path d="' + shift(d, p.x) + '"/>'); });
    });
    return out;
  }

  function resolveAccent(accent, theme) {
    const a = ACCENTS[accent];
    if (a) return a[theme] || a.dark;
    return /^#[0-9a-f]{3,8}$/i.test(accent || '') ? accent.toUpperCase() : ACCENTS.cartiqo.dark;
  }

  // Rough width of letter-spaced caps, used when no real measure is passed in.
  function estimate(text, size, spacing) {
    return text.length * (size * 0.68 + spacing);
  }

  function sentence(s) {
    s = String(s || '').trim();
    if (!s) return '';
    s = s[0].toUpperCase() + s.slice(1).toLowerCase();
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  function render(options) {
    const o = Object.assign({}, DEFAULTS, options);
    const W = Math.max(1, Math.round(o.width));
    const H = Math.max(1, Math.round(o.height));
    const theme = THEMES[o.theme] ? o.theme : 'dark';
    const t = THEMES[theme];
    const accent = resolveAccent(o.accent, theme);
    const measure = o.measure || estimate;
    const overline = String(o.overline || '').trim().toUpperCase();
    const motto = String(o.motto || '').trim().toUpperCase();
    const wm = layoutWordmark(o.wordmark);
    const label = [String(o.wordmark || '').trim(), sentence(o.motto)].filter(Boolean).join(' ') || 'CARTIQO';

    // Content size: the block takes up to 62% of the width and keeps the
    // base proportions on the height.
    const wmWidth = Math.round(wm.width * WORDMARK_SCALE);
    const ruleWidth = Math.max(wmWidth, motto ? measure(motto, 18, 6.4) + 48 : 0);
    const blockWidth = Math.max(ruleWidth, overline ? measure(overline, 13, 5.2) + 48 : 0, 1);
    const area = o.safe || { width: W, height: H };
    const k = Math.min(area.width * 0.62 / blockWidth, area.height / BASE_H) * o.scale;

    // With both lines the base layout is used as drawn. Otherwise whatever is
    // left is centred.
    const rows = [];
    if (overline) rows.push([68.6, 78]);
    if (wm.placed.length) rows.push([128.7, 223.3]);
    if (o.rule) rows.push([272, 272]);
    if (motto) rows.push([298, 311]);
    let dy = 0;
    if (!(overline && motto) && rows.length) {
      const top = Math.min.apply(null, rows.map(function (r) { return r[0]; }));
      const bottom = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
      dy = BASE_H / 2 - (top + bottom) / 2;
    }

    // The frame (grid size, corner marks) scales with the safe area.
    const fw = area.width;
    const fh = area.height;
    const f = Math.min(fw / BASE_W, fh / BASE_H);
    const fx = (W - fw) / 2;
    const fy = (H - fh) / 2;
    const cell = 40 * f;
    const inset = 40 * f;
    const arm = 22 * f;
    const id = 'ctq-grid-' + theme;

    const s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">');
    s.push('  <title>' + esc(label) + '</title>');
    s.push('');
    if (o.grid) {
      s.push('  <defs>');
      s.push('    <pattern id="' + id + '" width="' + num(cell) + '" height="' + num(cell) + '" patternUnits="userSpaceOnUse">');
      s.push('      <path d="M' + num(cell) + ' 0 V' + num(cell) + ' M0 ' + num(cell) + ' H' + num(cell) + '" fill="none" stroke="' + t.ink + '" stroke-opacity="' + t.grid + '" stroke-width="1"/>');
      s.push('    </pattern>');
      s.push('  </defs>');
      s.push('');
    }
    s.push('  <rect width="' + W + '" height="' + H + '" fill="' + t.bg + '"/>');
    if (o.grid) s.push('  <rect width="' + W + '" height="' + H + '" fill="url(#' + id + ')"/>');
    if (o.border) s.push('  <rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="none" stroke="' + t.ink + '" stroke-opacity="' + t.border + '"/>');

    if (o.corners) {
      const l = fx + inset;
      const r = fx + fw - inset;
      const top = fy + inset;
      const bot = fy + fh - inset;
      s.push('');
      s.push('  <g fill="none" stroke="' + t.ink + '" stroke-opacity="' + t.corners + '" stroke-width="' + num(1.25 * Math.max(1, f)) + '" stroke-linecap="square">');
      s.push('    <path d="M' + num(l) + ' ' + num(top + arm) + ' V' + num(top) + ' H' + num(l + arm) + '"/>');
      s.push('    <path d="M' + num(r - arm) + ' ' + num(top) + ' H' + num(r) + ' V' + num(top + arm) + '"/>');
      s.push('    <path d="M' + num(r) + ' ' + num(bot - arm) + ' V' + num(bot) + ' H' + num(r - arm) + '"/>');
      s.push('    <path d="M' + num(l + arm) + ' ' + num(bot) + ' H' + num(l) + ' V' + num(bot - arm) + '"/>');
      s.push('  </g>');
    }

    // Content is written in base coordinates and moved into place in one step.
    const ex = W / 2 - BASE_W / 2 * k;
    const ey = H / 2 + (dy - BASE_H / 2) * k;
    const moved = Math.abs(k - 1) > 1e-9 || Math.abs(ex) > 1e-9 || Math.abs(ey) > 1e-9;
    const pad = moved ? '    ' : '  ';
    s.push('');
    if (moved) s.push('  <g transform="translate(' + num(ex) + ' ' + num(ey) + ') scale(' + Math.round(k * 10000) / 10000 + ')">');

    if (overline) {
      s.push(pad + '<text x="' + num(BASE_W / 2 + 2.6) + '" y="78" fill="' + t.ink + '" fill-opacity="' + t.overline + '"');
      s.push(pad + '      font-family="' + esc(FONT) + '"');
      s.push(pad + '      font-size="13" font-weight="500" letter-spacing="5.2" text-anchor="middle">' + esc(overline) + '</text>');
      s.push('');
    }
    if (wm.placed.length) {
      s.push(pad + '<g transform="translate(' + num(BASE_W / 2 - wmWidth / 2) + ' 118) scale(' + WORDMARK_SCALE + ')" fill="none" stroke="' + t.ink + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">');
      s.push.apply(s, wordmarkShapes(wm.placed, accent, pad + '  '));
      s.push(pad + '</g>');
      s.push('');
    }
    if (o.rule) {
      s.push(pad + '<path d="M' + num(BASE_W / 2 - ruleWidth / 2) + ' 272 H' + num(BASE_W / 2 + ruleWidth / 2) + '" stroke="' + t.ink + '" stroke-opacity="' + t.rule + '" stroke-width="1"/>');
      s.push('');
    }
    if (motto) {
      s.push(pad + '<text x="' + num(BASE_W / 2 + 3.2) + '" y="311" fill="' + t.ink + '" fill-opacity="' + t.motto + '"');
      s.push(pad + '      font-family="' + esc(FONT) + '"');
      s.push(pad + '      font-size="18" font-weight="500" letter-spacing="6.4" text-anchor="middle">' + esc(motto) + '</text>');
    }
    if (moved) s.push('  </g>');
    s.push('</svg>');
    return s.join('\n').replace(/\n\n(\s*<\/)/g, '\n$1') + '\n';
  }

  // Just the wordmark, cropped to its strokes. Handy for headers and icons.
  function wordmark(text, color, accent) {
    const wm = layoutWordmark(text);
    const w = wm.width - 7 - GAP + 4;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="5 5 ' + num(w) + ' 46" role="img" aria-label="' + esc(text) + '">' +
      '<g fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
      wordmarkShapes(wm.placed, accent, '').join('') + '</g></svg>';
  }

  const api = {
    render: render,
    wordmark: wordmark,
    layoutWordmark: layoutWordmark,
    THEMES: THEMES,
    ACCENTS: ACCENTS,
    SIZES: SIZES,
    DEFAULTS: DEFAULTS,
    CHARACTERS: Object.keys(GLYPHS).join(''),
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CartiqoBanner = api;
})(this);
