/* CARTIQO banner renderer.
 *
 * Draws the wordmark with the same strokes as profile/assets/banner-*.svg and
 * lays the banner out for any size. The banner maker (index.html) uses it in
 * the browser, and it runs in Node too:
 *
 *   const { render } = require('./banner.js');
 *   const svg = render({ width: 1500, height: 500, motto: 'Honest by default' });
 *
 * With no options it draws the profile banner exactly.
 */
(function (root) {
  'use strict';

  // Background and text colours. `mode` picks the opacities below and which
  // step of a product accent the dot uses. `dot` replaces the CARTIQO violet
  // where it would vanish into the background.
  const THEMES = {
    dark: { name: 'Dark', mode: 'dark', bg: '#0E1013', ink: '#F4F4F6' },
    light: { name: 'Light', mode: 'light', bg: '#FFFAFA', ink: '#111113' },
    black: { name: 'Black', mode: 'dark', bg: '#000000', ink: '#FFFFFF' },
    midnight: { name: 'Midnight', mode: 'dark', bg: '#0A0F24', ink: '#E8ECFA' },
    graphite: { name: 'Graphite', mode: 'dark', bg: '#25282F', ink: '#F4F4F6' },
    paper: { name: 'Paper', mode: 'light', bg: '#F2EDE4', ink: '#1C1A17' },
    violet: {
      name: 'Violet', mode: 'dark', bg: '#7C5CFF', ink: '#FFFFFF', dot: '#0E1013',
      opacity: { grid: 0.08, border: 0.16, corners: 0.45, overline: 0.72, rule: 0.3, motto: 0.88 },
    },
  };
  const OPACITY = {
    dark: { grid: 0.05, border: 0.1, corners: 0.28, overline: 0.45, rule: 0.16, motto: 0.68 },
    light: { grid: 0.055, border: 0.12, corners: 0.3, overline: 0.5, rule: 0.18, motto: 0.72 },
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

  const FONTS = {
    sans: "Geist, Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    mono: "'Geist Mono', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
    serif: "Georgia, 'Times New Roman', Times, serif",
  };

  const PATTERNS = ['grid', 'dots', 'crosses', 'lines', 'diagonal', 'none'];

  // Where the glow sits, as fractions of the canvas.
  const GLOW_AT = {
    centre: [0.5, 0.5],
    top: [0.5, 0],
    bottom: [0.5, 1],
    left: [0, 0.5],
    right: [1, 0.5],
  };

  const DEFAULTS = {
    width: 1280,
    height: 360,
    safe: null,
    wordmark: 'CARTIQO.',
    overline: 'One account · eight products',
    motto: 'Honest by default',
    font: 'sans',
    caps: true,
    theme: 'dark',
    bg: null, // custom theme only
    ink: null, // custom theme only
    accent: 'cartiqo',
    fill: 'solid', // solid, gradient, glow or image
    bg2: null, // gradient end colour, a mix of background and dot when empty
    angle: 135,
    glow: 0.35,
    glowAt: 'centre',
    image: null, // a data: URL
    dim: 0.6,
    blur: 0,
    pattern: 'grid',
    patternSize: 1,
    patternStrength: 1,
    grain: 0,
    align: 'center',
    weight: 4,
    tracking: 0,
    scale: 1,
    corners: true,
    rule: true,
    border: true,
    measure: null,
  };

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

  function op(v) {
    return String(Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000);
  }

  function clamp(v, min, max, fallback) {
    v = Number(v);
    return isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hex(v, fallback) {
    v = String(v || '').trim();
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : fallback;
  }

  function rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(a, b, t) {
    const x = rgb(a);
    const y = rgb(b);
    return '#' + x.map(function (v, i) {
      return Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  function luminance(h) {
    const c = rgb(h).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  // WCAG contrast ratio between two colours, from 1 to 21.
  function contrast(a, b) {
    const x = luminance(hex(a, '#000000'));
    const y = luminance(hex(b, '#000000'));
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function resolveTheme(o) {
    const preset = THEMES[o.theme];
    const bg = preset ? preset.bg : hex(o.bg, THEMES.dark.bg);
    const ink = preset ? preset.ink : hex(o.ink, THEMES.dark.ink);
    const mode = preset ? preset.mode : luminance(bg) < 0.25 ? 'dark' : 'light';
    return {
      key: preset ? o.theme : 'custom',
      bg: bg,
      ink: ink,
      mode: mode,
      dot: preset ? preset.dot : null,
      opacity: Object.assign({}, OPACITY[mode], preset && preset.opacity),
    };
  }

  function resolveAccent(accent, theme) {
    if (accent === 'cartiqo' && theme.dot) return theme.dot;
    const a = ACCENTS[accent];
    if (a) return a[theme.mode];
    return hex(accent, ACCENTS.cartiqo.dark);
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
  function layoutWordmark(text, tracking) {
    const gap = GAP + (Number(tracking) || 0);
    const placed = [];
    let x = 7;
    let prev = null;
    glyphsOf(text).forEach(function (c) {
      const g = GLYPHS[c];
      if (prev) {
        const p = GLYPHS[prev];
        x += p.w + (p.r || 0) + gap + (g.l || 0) + (KERN[prev + c] || 0);
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

  // Rough width of letter-spaced text, used when no real measure is passed in.
  function estimate(text, size, spacing) {
    return text.length * (size * 0.68 + spacing);
  }

  function sentence(s) {
    s = String(s || '').trim();
    if (!s) return '';
    s = s[0].toUpperCase() + s.slice(1).toLowerCase();
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  // One tile of the background pattern, `c` units square.
  function patternTile(kind, c, ink, strength) {
    const m = c / 2;
    switch (kind) {
      case 'dots':
        return '<circle cx="' + num(m) + '" cy="' + num(m) + '" r="' + num(Math.max(1.4, c / 26)) + '" fill="' + ink + '" fill-opacity="' + op(strength * 3) + '"/>';
      case 'crosses': {
        const a = c / 10;
        return '<path d="M' + num(m - a) + ' ' + num(m) + ' H' + num(m + a) + ' M' + num(m) + ' ' + num(m - a) + ' V' + num(m + a) + '" fill="none" stroke="' + ink + '" stroke-opacity="' + op(strength * 2.5) + '" stroke-width="1"/>';
      }
      case 'lines':
        return '<path d="M0 ' + num(c) + ' H' + num(c) + '" fill="none" stroke="' + ink + '" stroke-opacity="' + op(strength * 1.3) + '" stroke-width="1"/>';
      case 'diagonal':
        return '<path d="M-1 1 L1 -1 M0 ' + num(c) + ' L' + num(c) + ' 0 M' + num(c - 1) + ' ' + num(c + 1) + ' L' + num(c + 1) + ' ' + num(c - 1) + '" fill="none" stroke="' + ink + '" stroke-opacity="' + op(strength * 1.3) + '" stroke-width="1"/>';
      default:
        return '<path d="M' + num(c) + ' 0 V' + num(c) + ' M0 ' + num(c) + ' H' + num(c) + '" fill="none" stroke="' + ink + '" stroke-opacity="' + op(strength) + '" stroke-width="1"/>';
    }
  }

  function render(options) {
    const o = Object.assign({}, DEFAULTS, options);
    if (o.grid === false) o.pattern = 'none';
    const W = Math.max(1, Math.round(o.width));
    const H = Math.max(1, Math.round(o.height));
    const t = resolveTheme(o);
    const opacity = t.opacity;
    const accent = resolveAccent(o.accent, t);
    const font = FONTS[o.font] || FONTS.sans;
    const measure = o.measure || estimate;
    const caps = o.caps !== false;
    const line = function (s) { s = String(s || '').trim(); return caps ? s.toUpperCase() : s; };
    const overline = line(o.overline);
    const motto = line(o.motto);
    const weight = clamp(o.weight, 1, 10, 4);
    const wm = layoutWordmark(o.wordmark, clamp(o.tracking, -6, 40, 0));
    const label = [String(o.wordmark || '').trim(), sentence(o.motto)].filter(Boolean).join(' ') || 'CARTIQO';
    const align = o.align === 'left' || o.align === 'right' ? o.align : 'center';

    // Content size: the block takes up to 62% of the width and keeps the
    // base proportions on the height.
    const wmWidth = Math.round(wm.width * WORDMARK_SCALE);
    const overlineWidth = overline ? measure(overline, 13, 5.2, font) : 0;
    const mottoWidth = motto ? measure(motto, 18, 6.4, font) : 0;
    const ruleWidth = Math.max(wmWidth, motto ? mottoWidth + 48 : 0);
    const blockWidth = Math.max(ruleWidth, overline ? overlineWidth + 48 : 0, 1);
    const area = o.safe || { width: W, height: H };
    const k = Math.min(area.width * 0.62 / blockWidth, area.height / BASE_H) * clamp(o.scale, 0.1, 5, 1);

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

    // The frame (pattern size, corner marks) scales with the safe area.
    const fw = area.width;
    const fh = area.height;
    const f = Math.min(fw / BASE_W, fh / BASE_H);
    const fx = (W - fw) / 2;
    const fy = (H - fh) / 2;
    const inset = 40 * f;
    const arm = 22 * f;
    const pattern = PATTERNS.indexOf(o.pattern) >= 0 ? o.pattern : 'grid';
    const cell = 40 * f * clamp(o.patternSize, 0.25, 4, 1) * (pattern === 'diagonal' ? 0.5 : 1);
    const patternStrength = opacity.grid * clamp(o.patternStrength, 0, 10, 1);
    const fill = o.fill === 'image' && !o.image ? 'solid' : o.fill;
    const blur = fill === 'image' ? clamp(o.blur, 0, 40, 0) * f : 0;
    const grain = clamp(o.grain, 0, 1, 0);
    const patternId = 'ctq-grid-' + t.key;

    const defs = [];
    if (fill === 'gradient') {
      const a = clamp(o.angle, -360, 720, 135) * Math.PI / 180;
      const ux = Math.sin(a);
      const uy = -Math.cos(a);
      const len = (Math.abs(W * ux) + Math.abs(H * uy)) / 2;
      defs.push('<linearGradient id="ctq-fill" gradientUnits="userSpaceOnUse" x1="' + num(W / 2 - ux * len) + '" y1="' + num(H / 2 - uy * len) + '" x2="' + num(W / 2 + ux * len) + '" y2="' + num(H / 2 + uy * len) + '">');
      defs.push('  <stop offset="0" stop-color="' + t.bg + '"/>');
      defs.push('  <stop offset="1" stop-color="' + hex(o.bg2, mix(t.bg, accent, 0.35)) + '"/>');
      defs.push('</linearGradient>');
    }
    if (fill === 'glow') {
      const at = GLOW_AT[o.glowAt] || GLOW_AT.centre;
      const r = Math.max(W, H) * (o.glowAt === 'centre' || !GLOW_AT[o.glowAt] ? 0.5 : 0.65);
      defs.push('<radialGradient id="ctq-glow" gradientUnits="userSpaceOnUse" cx="' + num(W * at[0]) + '" cy="' + num(H * at[1]) + '" r="' + num(r) + '">');
      defs.push('  <stop offset="0" stop-color="' + accent + '" stop-opacity="' + op(clamp(o.glow, 0, 1, 0.35)) + '"/>');
      defs.push('  <stop offset="1" stop-color="' + accent + '" stop-opacity="0"/>');
      defs.push('</radialGradient>');
    }
    if (blur) {
      defs.push('<filter id="ctq-blur" x="0" y="0" width="1" height="1"><feGaussianBlur stdDeviation="' + num(blur) + '"/></filter>');
    }
    if (pattern !== 'none') {
      defs.push('<pattern id="' + patternId + '" width="' + num(cell) + '" height="' + num(cell) + '" patternUnits="userSpaceOnUse">');
      defs.push('  ' + patternTile(pattern, cell, t.ink, patternStrength));
      defs.push('</pattern>');
    }
    if (grain) {
      defs.push('<filter id="ctq-grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>');
    }

    const s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">');
    s.push('  <title>' + esc(label) + '</title>');
    s.push('');
    if (defs.length) {
      s.push('  <defs>');
      defs.forEach(function (d) { s.push('    ' + d); });
      s.push('  </defs>');
      s.push('');
    }
    s.push('  <rect width="' + W + '" height="' + H + '" fill="' + t.bg + '"/>');
    if (fill === 'gradient') s.push('  <rect width="' + W + '" height="' + H + '" fill="url(#ctq-fill)"/>');
    if (fill === 'glow') s.push('  <rect width="' + W + '" height="' + H + '" fill="url(#ctq-glow)"/>');
    if (fill === 'image') {
      // A blurred image is drawn a little larger so its edges stay sharp.
      const b = blur * 3;
      s.push('  <image href="' + esc(o.image) + '" x="' + num(-b) + '" y="' + num(-b) + '" width="' + num(W + 2 * b) + '" height="' + num(H + 2 * b) + '" preserveAspectRatio="xMidYMid slice"' + (blur ? ' filter="url(#ctq-blur)"' : '') + '/>');
      s.push('  <rect width="' + W + '" height="' + H + '" fill="' + t.bg + '" fill-opacity="' + op(clamp(o.dim, 0, 1, 0.6)) + '"/>');
    }
    if (pattern !== 'none') s.push('  <rect width="' + W + '" height="' + H + '" fill="url(#' + patternId + ')"/>');
    if (grain) s.push('  <rect width="' + W + '" height="' + H + '" filter="url(#ctq-grain)" opacity="' + op(grain * 0.3) + '"/>');
    if (o.border) s.push('  <rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="none" stroke="' + t.ink + '" stroke-opacity="' + opacity.border + '"/>');

    if (o.corners) {
      const l = fx + inset;
      const r = fx + fw - inset;
      const top = fy + inset;
      const bot = fy + fh - inset;
      s.push('');
      s.push('  <g fill="none" stroke="' + t.ink + '" stroke-opacity="' + opacity.corners + '" stroke-width="' + num(1.25 * Math.max(1, f)) + '" stroke-linecap="square">');
      s.push('    <path d="M' + num(l) + ' ' + num(top + arm) + ' V' + num(top) + ' H' + num(l + arm) + '"/>');
      s.push('    <path d="M' + num(r - arm) + ' ' + num(top) + ' H' + num(r) + ' V' + num(top + arm) + '"/>');
      s.push('    <path d="M' + num(r) + ' ' + num(bot - arm) + ' V' + num(bot) + ' H' + num(r - arm) + '"/>');
      s.push('    <path d="M' + num(l + arm) + ' ' + num(bot) + ' H' + num(l) + ' V' + num(bot - arm) + '"/>');
      s.push('  </g>');
    }

    // Content is written in base coordinates and moved into place in one step.
    // Centred content keeps the base layout; left and right content hangs off
    // x = 0 in base coordinates, lined up on the wordmark's ink.
    let ex;
    let anchor = 'middle';
    let overX = BASE_W / 2 + 2.6;
    let mottoX = BASE_W / 2 + 3.2;
    let wmX = BASE_W / 2 - wmWidth / 2;
    let rule = [BASE_W / 2 - ruleWidth / 2, BASE_W / 2 + ruleWidth / 2];
    if (align === 'center') {
      ex = W / 2 - BASE_W / 2 * k;
    } else {
      const first = wm.placed[0];
      const last = wm.placed[wm.placed.length - 1];
      const inkLeft = first ? (first.x - (GLYPHS[first.c].dot ? 0 : weight / 2)) * WORDMARK_SCALE : 0;
      const inkRight = last ? (last.x + GLYPHS[last.c].w + (GLYPHS[last.c].dot ? 0 : weight / 2)) * WORDMARK_SCALE : 0;
      const ruleLength = Math.max(inkRight - inkLeft, mottoWidth - 6.4);
      if (align === 'left') {
        ex = fx + fw * 0.08;
        anchor = 'start';
        overX = 0;
        mottoX = 0;
        wmX = -inkLeft;
        rule = [0, ruleLength];
      } else {
        ex = fx + fw * 0.92;
        anchor = 'end';
        // Letter spacing trails the last letter, so end-anchored text moves right by one space.
        overX = 5.2;
        mottoX = 6.4;
        wmX = -inkRight;
        rule = [-ruleLength, 0];
      }
    }
    const ey = H / 2 + (dy - BASE_H / 2) * k;
    const moved = Math.abs(k - 1) > 1e-9 || Math.abs(ex) > 1e-9 || Math.abs(ey) > 1e-9;
    const pad = moved ? '    ' : '  ';
    s.push('');
    if (moved) s.push('  <g transform="translate(' + num(ex) + ' ' + num(ey) + ') scale(' + Math.round(k * 10000) / 10000 + ')">');

    if (overline) {
      s.push(pad + '<text x="' + num(overX) + '" y="78" fill="' + t.ink + '" fill-opacity="' + opacity.overline + '"');
      s.push(pad + '      font-family="' + esc(font) + '"');
      s.push(pad + '      font-size="13" font-weight="500" letter-spacing="5.2" text-anchor="' + anchor + '">' + esc(overline) + '</text>');
      s.push('');
    }
    if (wm.placed.length) {
      s.push(pad + '<g transform="translate(' + num(wmX) + ' 118) scale(' + WORDMARK_SCALE + ')" fill="none" stroke="' + t.ink + '" stroke-width="' + num(weight) + '" stroke-linecap="round" stroke-linejoin="round">');
      s.push.apply(s, wordmarkShapes(wm.placed, accent, pad + '  '));
      s.push(pad + '</g>');
      s.push('');
    }
    if (o.rule) {
      s.push(pad + '<path d="M' + num(rule[0]) + ' 272 H' + num(rule[1]) + '" stroke="' + t.ink + '" stroke-opacity="' + opacity.rule + '" stroke-width="1"/>');
      s.push('');
    }
    if (motto) {
      s.push(pad + '<text x="' + num(mottoX) + '" y="311" fill="' + t.ink + '" fill-opacity="' + opacity.motto + '"');
      s.push(pad + '      font-family="' + esc(font) + '"');
      s.push(pad + '      font-size="18" font-weight="500" letter-spacing="6.4" text-anchor="' + anchor + '">' + esc(motto) + '</text>');
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
    resolveTheme: resolveTheme,
    resolveAccent: resolveAccent,
    mix: mix,
    contrast: contrast,
    THEMES: THEMES,
    ACCENTS: ACCENTS,
    SIZES: SIZES,
    FONTS: FONTS,
    PATTERNS: PATTERNS,
    DEFAULTS: DEFAULTS,
    CHARACTERS: Object.keys(GLYPHS).join(''),
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CartiqoBanner = api;
})(this);
