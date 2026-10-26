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
    animate: 'none', // none, or an id from ANIMATION_KINDS
    duration: 4, // seconds for one loop
    loop: true, // false plays once and stops on the finished wordmark
    frame: null, // 0 to 1 through the loop draws that moment as a still
    order: 'ltr', // ltr, rtl, centre, edges or random
    stagger: null, // 0 (together) to 1 (one by one); empty uses the animation's own
    easing: 'smooth', // smooth, snappy, springy or linear
    exit: 'together', // together, or reverse to leave one by one
    intensity: 1, // how far things move
    animateLines: false,
    animateRule: false,
    animateCorners: false,
    measure: null,
  };

  const LOGO_TYPES = ['wordmark', 'icon', 'lockup'];

  const LOGO_DEFAULTS = {
    type: 'wordmark', // wordmark, icon, or lockup (wordmark with the two lines)
    wordmark: DEFAULTS.wordmark,
    mark: 'C.', // what the icon shows
    overline: DEFAULTS.overline,
    motto: DEFAULTS.motto,
    font: 'sans',
    caps: true,
    theme: 'dark',
    bg: null,
    ink: null,
    accent: 'cartiqo',
    background: 'none', // none, solid or gradient
    pattern: 'none', // drawn over a solid or gradient background
    patternSize: 1,
    patternStrength: 1,
    grain: 0,
    bg2: null,
    angle: 135,
    shape: 'rounded', // square, rounded, or circle for icons
    radius: 0.22,
    padding: 0.12,
    size: 256, // the height, and the width of an icon
    weight: 4,
    tracking: 0,
    rule: true,
    animate: 'none',
    duration: 4,
    loop: true,
    frame: null,
    order: 'ltr',
    stagger: null,
    easing: 'smooth',
    exit: 'together',
    intensity: 1,
    animateLines: false,
    animateRule: false,
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

  function wordmarkShapes(placed, accent, indent, a) {
    const out = [];
    const n = placed.length;
    if (a && a.order === 'random') a.shuffle = shuffle(a.seed, n);
    placed.forEach(function (p, i) {
      const g = GLYPHS[p.c];
      const dot = '<circle cx="' + num(p.x + 4) + '" cy="43" r="4" fill="' + accent + '" stroke="none"/>';
      if (!a) {
        if (g.dot) out.push(indent + dot);
        else g.d.forEach(function (d) { out.push(indent + '<path d="' + shift(d, p.x) + '"/>'); });
        return;
      }
      if (!g.dot && !g.d.length) return; // a space
      out.push(indent + letter(a, p, g, i, n, dot));
    });
    return out;
  }

  // Animations run over a loop: a beat of nothing, the letters come in (in
  // the chosen order and stagger), a hold, then they leave. Played once, they
  // stop as the last letter lands. A frame draws one moment of the loop as a
  // still. Wave and Pulse have no coming and going: they move all through the
  // loop, and keep looping even when played once.
  const ANIMATION_KINDS = [
    { id: 'draw', name: 'Draw the strokes', len: 0.5 },
    { id: 'rise', name: 'Rise letter by letter', len: 0.4 },
    { id: 'drop', name: 'Drop in', len: 0.4 },
    { id: 'slide', name: 'Slide in', len: 0.45 },
    { id: 'pop', name: 'Pop in', len: 0.35 },
    { id: 'fade', name: 'Fade in', len: 0.5 },
    { id: 'blur', name: 'Come into focus', len: 0.5 },
    { id: 'type', name: 'Type letter by letter', len: 0.1 },
    { id: 'flicker', name: 'Flicker on like neon', len: 0.35 },
    { id: 'wave', name: 'Wave', loops: true },
    { id: 'pulse', name: 'Pulse the dot', loops: true },
  ];
  const KINDS = {};
  ANIMATION_KINDS.forEach(function (k) { KINDS[k.id] = k; });
  const ANIMATIONS = ['none'].concat(ANIMATION_KINDS.map(function (k) { return k.id; }));
  const ORDERS = ['ltr', 'rtl', 'centre', 'edges', 'random'];
  const EASINGS = {
    smooth: [0.65, 0, 0.35, 1],
    snappy: [0.16, 1, 0.3, 1],
    springy: [0.16, 1, 0.3, 1], // plus an overshoot, see comeAndGo
    linear: [0, 0, 1, 1],
  };
  // Moments in the loop, as fractions of it. Leaving one by one starts
  // earlier than leaving together, so the last letter is gone in time.
  const LOOP = { start: 0.08, end: 0.5, out: 0.86, outEach: 0.72, gone: 0.95 };
  const SPAN = LOOP.end - LOOP.start;
  // When the lines, divider and corner marks come in.
  const EXTRA = { corners: [0.02, 0.18], overline: [0.1, 0.28], rule: [0.14, 0.46], motto: [0.32, 0.5] };

  // The stagger an animation looks best with: 0 moves every letter together,
  // 1 moves them strictly one after another.
  function staggerDefault(id) {
    const k = KINDS[id];
    return k && k.len ? (1 - k.len) / 0.94 : 0.5;
  }

  // How much of the loop playing once covers.
  function animationSpan(id) {
    const k = KINDS[id];
    return k && k.loops ? 1 : LOOP.end;
  }

  function animationOf(o, text) {
    const kind = KINDS[o.animate];
    if (!kind) return null;
    const stagger = o.stagger == null ? staggerDefault(kind.id) : clamp(o.stagger, 0, 1, 0.5);
    return {
      kind: kind.id,
      loops: !!kind.loops,
      once: o.loop === false,
      seconds: clamp(o.duration, 1, 30, 4),
      frame: o.frame == null ? null : clamp(o.frame, 0, 1, 1),
      order: ORDERS.indexOf(o.order) >= 0 ? o.order : 'ltr',
      len: SPAN * (1 - stagger * 0.94),
      spline: EASINGS[o.easing] || EASINGS.smooth,
      springy: o.easing === 'springy',
      oneByOne: o.exit === 'reverse',
      size: clamp(o.intensity, 0.25, 3, 1),
      lines: !!o.animateLines,
      rule: !!o.animateRule,
      corners: !!o.animateCorners,
      seed: String(text || ''),
    };
  }

  function bezier(t, p1, p2) {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
  }

  function ease(x, spline) {
    if (spline[0] === spline[1] && spline[2] === spline[3]) return x;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (bezier(mid, spline[0], spline[2]) < x) lo = mid; else hi = mid;
    }
    return bezier((lo + hi) / 2, spline[1], spline[3]);
  }

  // A value along `keys` ([time, value] pairs from 0 to 1) at time t.
  function valueAt(keys, t, spline) {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const span = keys[i][0] - keys[i - 1][0];
        const u = span > 0 ? ease((t - keys[i - 1][0]) / span, spline) : 1;
        return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * u;
      }
    }
    return keys[keys.length - 1][1];
  }

  // Where letter i of n comes in the order: 0 is first, 1 is last.
  function orderOf(a, i, n) {
    if (n < 2) return 0;
    const t = i / (n - 1);
    if (a.order === 'rtl') return 1 - t;
    if (a.order === 'centre') return Math.abs(t - 0.5) * 2;
    if (a.order === 'edges') return 1 - Math.abs(t - 0.5) * 2;
    if (a.order === 'random') return a.shuffle[i] / (n - 1);
    return t;
  }

  // A fixed shuffle for the random order: the same text always shuffles the same way.
  function shuffle(seed, n) {
    const keys = [];
    for (let i = 0; i < n; i++) {
      let h = 2166136261;
      const s = seed + '#' + i;
      for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); }
      keys.push([h >>> 0, i]);
    }
    keys.sort(function (x, y) { return x[0] - y[0]; });
    const rank = [];
    keys.forEach(function (k, r) { rank[k[1]] = r; });
    return rank;
  }

  // Keys for a value that comes in from `from` to `to` over [t0, t1] and goes
  // back as the loop ends. `f` is the letter's place in the order, for leaving
  // one by one; `bounce` lets springy easing overshoot.
  function comeAndGo(a, f, t0, t1, from, to, bounce) {
    const keys = [[0, from], [t0, from]];
    if (bounce && a.springy) keys.push([t0 + (t1 - t0) * 0.6, to + (to - from) * 0.16]);
    keys.push([t1, to]);
    let out = LOOP.out;
    let len = LOOP.gone - LOOP.out;
    if (a.oneByOne && f != null) {
      len = (t1 - t0) * (LOOP.gone - LOOP.outEach) / SPAN;
      out = LOOP.outEach + (LOOP.gone - LOOP.outEach - len) * f;
    }
    keys.push([out, to], [out + len, from], [1, from]);
    return keys;
  }

  // Turns keys into the value for a still (the moment a.frame, or the
  // finished look) and the SMIL that plays them. `as` says how a value is
  // written: a number, 'y' or 'x' for a translate, 's' for a scale, 'sx' for
  // a horizontal scale. A `phase` starts a looping track part-way through.
  function play(a, attr, keys, as, opts) {
    const spline = (opts && opts.spline) || a.spline;
    const phase = (opts && opts.phase) || 0;
    if (a.frame != null) return { value: valueAt(keys, (a.frame + phase) % 1, spline), tag: '' };
    const once = a.once && !a.loops;
    let ks = keys;
    if (once) {
      ks = keys.filter(function (k) { return k[0] < LOOP.end; }).map(function (k) { return [k[0] / LOOP.end, k[1]]; });
      ks.push([1, valueAt(keys, LOOP.end, spline)]);
    }
    const fmt = function (v) { return as === 'y' ? '0 ' + num(v) : as === 'x' ? num(v) + ' 0' : as === 'sx' ? num(v) + ' 1' : num(v); };
    const times = ks.map(function (k) { return Math.round(k[0] * 10000) / 10000; });
    const common = ' values="' + ks.map(function (k) { return fmt(k[1]); }).join(';') + '" dur="' + num(once ? a.seconds * LOOP.end : a.seconds) + 's" ' +
      (once ? 'fill="freeze"' : 'repeatCount="indefinite"') + (phase ? ' begin="' + num(-phase * a.seconds) + 's"' : '') +
      ' keyTimes="' + times.join(';') + '" calcMode="spline" keySplines="' + times.slice(1).map(function () { return spline.join(' '); }).join(';') + '"';
    const type = as === 'y' || as === 'x' ? 'translate' : as === 's' || as === 'sx' ? 'scale' : null;
    return {
      value: a.loops ? keys[0][1] : valueAt(keys, LOOP.end, spline),
      tag: type ? '<animateTransform attributeName="transform" type="' + type + '"' + common + '/>' : '<animate attributeName="' + attr + '"' + common + '/>',
    };
  }

  // One animated letter (or the dot).
  function letter(a, p, g, i, n, dot) {
    const f = orderOf(a, i, n);
    const t0 = LOOP.start + (SPAN - a.len) * f;
    const t1 = t0 + a.len;
    const cx = p.x + (g.dot ? 4 : g.w / 2);
    const cy = g.dot ? 43 : 27;
    const plain = function () { return g.dot ? dot : g.d.map(function (d) { return '<path d="' + shift(d, p.x) + '"/>'; }).join(''); };
    let shapes = null;
    let attrs = '';
    let tags = '';
    let before = '';

    // Scales the letter around its middle.
    function scaled(inner, m) {
      return '<g transform="translate(' + num(cx) + ' ' + num(cy) + ')"><g transform="scale(' + num(m.value) + ')">' + m.tag +
        '<g transform="translate(' + num(-cx) + ' ' + num(-cy) + ')">' + inner + '</g></g></g>';
    }
    function fade(keys, spline) {
      const m = play(a, 'opacity', keys || comeAndGo(a, f, t0, t1, 0, 1), null, { spline: spline });
      attrs += ' opacity="' + op(m.value) + '"';
      tags += m.tag;
    }
    function move(as, from, keys, opts) {
      const m = play(a, 'transform', keys || comeAndGo(a, f, t0, t1, from, 0, true), as, opts);
      attrs += ' transform="translate(' + (as === 'x' ? num(m.value) + ' 0' : '0 ' + num(m.value)) + ')"';
      tags += m.tag;
    }

    switch (a.kind) {
      case 'draw':
        if (g.dot) { fade(); break; }
        // Dashes restart on every subpath, so each stroke is drawn as its own path.
        // Hidden strokes start a little past the dash, or round caps leave a dot.
        shapes = [].concat.apply([], g.d.map(function (d) { return d.split(/(?=M)/); })).map(function (d) {
          const m = play(a, 'stroke-dashoffset', comeAndGo(a, f, t0, t1, 1.05, 0), null);
          return '<path d="' + shift(d.trim(), p.x) + '" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="' + num(m.value) + '">' + m.tag + '</path>';
        }).join('');
        break;
      case 'rise': fade(); move('y', 14 * a.size); break;
      case 'drop': fade(); move('y', -18 * a.size); break;
      case 'slide': fade(); move('x', -22 * a.size); break;
      case 'pop':
        fade();
        shapes = scaled(plain(), play(a, 'transform', comeAndGo(a, f, t0, t1, Math.max(0, 1 - a.size), 1, true), 's'));
        break;
      case 'fade': fade(); break;
      case 'blur': {
        // Each letter gets its own blur, measured in the wordmark's units.
        fade();
        const id = 'ctq-focus-' + i;
        const m = play(a, 'stdDeviation', comeAndGo(a, f, t0, t1, 5 * a.size, 0), null);
        before = '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="' + num(p.x - 30) + '" y="-25" width="' + num((g.dot ? 8 : g.w) + 60) + '" height="105">' +
          '<feGaussianBlur stdDeviation="' + num(m.value) + '">' + m.tag + '</feGaussianBlur></filter>';
        attrs += ' filter="url(#' + id + ')"';
        break;
      }
      case 'type': fade(); break;
      case 'flicker': {
        // Stutters on like a neon tube, then leaves like the others.
        const keys = [[0, 0], [t0, 0]];
        const steps = [0.85, 0.1, 0.7, 0.15, 1, 0.45, 1];
        steps.forEach(function (v, k) { keys.push([t0 + (t1 - t0) * (k + 1) / steps.length, v]); });
        fade(keys.concat(comeAndGo(a, f, t0, t1, 0, 1).slice(-3)), EASINGS.linear);
        break;
      }
      case 'wave': {
        // A ripple that runs through the letters in the chosen order.
        const amp = 5 * a.size;
        move('y', 0, [[0, 0], [0.25, -amp], [0.5, 0], [0.75, amp], [1, 0]], { phase: f * 0.5, spline: EASINGS.smooth });
        break;
      }
      case 'pulse':
        // Only the dot moves: two beats, then a rest.
        if (g.dot) {
          shapes = scaled(dot, play(a, 'transform', [[0, 1], [0.06, 1 + 0.6 * a.size], [0.14, 1], [0.2, 1 + 0.35 * a.size], [0.3, 1], [1, 1]], 's', { spline: EASINGS.smooth }));
        }
        break;
    }

    const wrap = attrs || tags;
    return before + (wrap ? '<g' + attrs + '>' + tags : '') + (shapes != null ? shapes : plain()) + (wrap ? '</g>' : '');
  }

  // The lines, divider and corner marks can come in too: corners first, then
  // the line above, the divider and, as the last letter lands, the motto.
  // Returns the markup that goes around the part.
  function extra(a, part, centre) {
    const on = a && !a.loops && (part === 'overline' || part === 'motto' ? a.lines : a[part]);
    if (!on) return { open: '', close: '' };
    const w = EXTRA[part];
    const fade = play(a, 'opacity', comeAndGo(a, null, w[0], w[1], 0, 1), null);
    const faded = '<g opacity="' + op(fade.value) + '">' + fade.tag;
    if (part === 'corners') return { open: faded, close: '</g>' };
    if (part === 'rule') {
      // The divider grows out from its middle.
      const m = play(a, 'transform', comeAndGo(a, null, w[0], w[1], 0, 1), 'sx');
      return {
        open: faded + '<g transform="translate(' + num(centre) + ' 272)"><g transform="scale(' + num(m.value) + ' 1)">' + m.tag + '<g transform="translate(' + num(-centre) + ' -272)">',
        close: '</g></g></g></g>',
      };
    }
    const lift = play(a, 'transform', comeAndGo(a, null, w[0], w[1], 8 * a.size, 0, true), 'y');
    return { open: '<g opacity="' + op(fade.value) + '" transform="translate(0 ' + num(lift.value) + ')">' + fade.tag + lift.tag, close: '</g>' };
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

  // A linear gradient across the whole canvas, angled like CSS (0 is upwards).
  function gradientDef(W, H, angle, from, to) {
    const a = clamp(angle, -360, 720, 135) * Math.PI / 180;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    const len = (Math.abs(W * ux) + Math.abs(H * uy)) / 2;
    return [
      '<linearGradient id="ctq-fill" gradientUnits="userSpaceOnUse" x1="' + num(W / 2 - ux * len) + '" y1="' + num(H / 2 - uy * len) + '" x2="' + num(W / 2 + ux * len) + '" y2="' + num(H / 2 + uy * len) + '">',
      '  <stop offset="0" stop-color="' + from + '"/>',
      '  <stop offset="1" stop-color="' + to + '"/>',
      '</linearGradient>',
    ];
  }

  // Where the wordmark's strokes really start and end, in glyph units.
  function inkBox(placed, weight) {
    const half = weight / 2;
    let left = Infinity;
    let right = -Infinity;
    let bottom = 47 + half;
    placed.forEach(function (p) {
      const g = GLYPHS[p.c];
      if (!g.dot && !g.d.length) return;
      const pad = g.dot ? 0 : half;
      left = Math.min(left, p.x - pad);
      right = Math.max(right, p.x + (p.c === 'Q' ? 32 : g.w) + pad);
      if (p.c === 'Q') bottom = 49 + half;
    });
    if (left > right) { left = 0; right = 40; }
    return { left: left, right: right, top: 7 - half, bottom: bottom };
  }

  // Logos: the wordmark on its own, an icon, or the wordmark with its lines.
  // Wordmarks and lockups take `size` as their height and get as wide as they
  // need; icons are `size` square.
  function renderLogo(options) {
    const o = Object.assign({}, LOGO_DEFAULTS, options);
    const type = LOGO_TYPES.indexOf(o.type) >= 0 ? o.type : 'wordmark';
    const t = resolveTheme(o);
    const accent = resolveAccent(o.accent, t);
    const weight = clamp(o.weight, 1, 10, 4);
    const size = Math.round(clamp(o.size, 16, 4096, 256));
    const padding = clamp(o.padding, 0, 0.45, 0.12);
    const text = type === 'icon' ? o.mark : o.wordmark;
    const wm = layoutWordmark(text, clamp(o.tracking, -6, 40, 0));
    const box = inkBox(wm.placed, weight);
    const anim = animationOf(o, text);
    const stroke = 'fill="none" stroke="' + t.ink + '" stroke-width="' + num(weight) + '" stroke-linecap="round" stroke-linejoin="round"';
    const body = [];
    let W;
    let H;
    let label;

    if (type === 'lockup') {
      // The banner's centre block without the frame, cropped to its ink.
      const font = FONTS[o.font] || FONTS.sans;
      const measure = o.measure || estimate;
      const caps = o.caps !== false;
      const line = function (s) { s = String(s || '').trim(); return caps ? s.toUpperCase() : s; };
      const overline = line(o.overline);
      const motto = line(o.motto);
      const S = WORDMARK_SCALE;
      const cx = BASE_W / 2;
      const inkWidth = wm.placed.length ? (box.right - box.left) * S : 0;
      const overlineWidth = overline ? measure(overline, 13, 5.2, font) - 5.2 : 0;
      const mottoWidth = motto ? measure(motto, 18, 6.4, font) - 6.4 : 0;
      const ruleWidth = Math.max(inkWidth, mottoWidth);
      const blockWidth = Math.max(inkWidth, overlineWidth, mottoWidth, 1);
      // Without the divider the motto moves up into its space.
      const mottoY = o.rule ? 311 : 287;
      const top = overline ? 68.6 : 118 + box.top * S;
      const bottom = motto ? mottoY + (caps ? 0 : 4) : o.rule ? 272.5 : 118 + box.bottom * S;
      H = size;
      const pad = padding * H;
      const k = Math.max(0.01, H - 2 * pad) / (bottom - top);
      W = Math.max(1, Math.ceil(blockWidth * k + 2 * pad));
      body.push('<g transform="translate(' + num(W / 2 - cx * k) + ' ' + num(pad - top * k) + ') scale(' + Math.round(k * 10000) / 10000 + ')">');
      if (overline) {
        const e = extra(anim, 'overline');
        body.push('  ' + e.open + '<text x="' + num(cx + 2.6) + '" y="78" fill="' + t.ink + '" fill-opacity="' + t.opacity.overline + '" font-family="' + esc(font) + '" font-size="13" font-weight="500" letter-spacing="5.2" text-anchor="middle">' + esc(overline) + '</text>' + e.close);
      }
      if (wm.placed.length) {
        body.push('  <g transform="translate(' + num(cx - (box.left + box.right) / 2 * S) + ' 118) scale(' + S + ')" ' + stroke + '>');
        body.push.apply(body, wordmarkShapes(wm.placed, accent, '    ', anim));
        body.push('  </g>');
      }
      if (o.rule) {
        const e = extra(anim, 'rule', cx);
        body.push('  ' + e.open + '<path d="M' + num(cx - ruleWidth / 2) + ' 272 H' + num(cx + ruleWidth / 2) + '" stroke="' + t.ink + '" stroke-opacity="' + t.opacity.rule + '" stroke-width="1"/>' + e.close);
      }
      if (motto) {
        const e = extra(anim, 'motto');
        body.push('  ' + e.open + '<text x="' + num(cx + 3.2) + '" y="' + mottoY + '" fill="' + t.ink + '" fill-opacity="' + t.opacity.motto + '" font-family="' + esc(font) + '" font-size="18" font-weight="500" letter-spacing="6.4" text-anchor="middle">' + esc(motto) + '</text>' + e.close);
      }
      body.push('</g>');
      label = [String(o.wordmark || '').trim(), sentence(o.motto)].filter(Boolean).join(' ');
    } else {
      const inkWidth = box.right - box.left;
      const inkHeight = box.bottom - box.top;
      let k;
      if (type === 'icon') {
        W = H = size;
        k = size * Math.max(0.05, 1 - 2 * padding) / Math.max(inkWidth, inkHeight);
      } else {
        H = size;
        const pad = padding * H;
        k = Math.max(0.01, H - 2 * pad) / inkHeight;
        W = Math.max(1, Math.ceil(inkWidth * k + 2 * pad));
      }
      body.push('<g transform="translate(' + num(W / 2 - (box.left + box.right) / 2 * k) + ' ' + num(H / 2 - (box.top + box.bottom) / 2 * k) + ') scale(' + Math.round(k * 10000) / 10000 + ')" ' + stroke + '>');
      body.push.apply(body, wordmarkShapes(wm.placed, accent, '  ', anim));
      body.push('</g>');
      label = String(text || '').trim();
    }
    label = label || 'CARTIQO';

    const background = o.background === 'solid' || o.background === 'gradient' ? o.background : 'none';
    const shape = o.shape === 'circle' && type === 'icon' ? 'circle' : o.shape === 'square' ? 'square' : 'rounded';
    const fill = background === 'gradient' ? 'url(#ctq-fill)' : t.bg;
    const pattern = background !== 'none' && PATTERNS.indexOf(o.pattern) >= 0 ? o.pattern : 'none';
    const grain = background !== 'none' ? clamp(o.grain, 0, 1, 0) : 0;
    // Patterns scale with the logo the way they scale with a 360 high banner.
    const cell = 40 * Math.min(W, H) / BASE_H * clamp(o.patternSize, 0.25, 4, 1) * (pattern === 'diagonal' ? 0.5 : 1);
    const plate = function (paint, extra) {
      if (shape === 'circle') return '  <circle cx="' + num(W / 2) + '" cy="' + num(H / 2) + '" r="' + num(Math.min(W, H) / 2) + '" fill="' + paint + '"' + (extra || '') + '/>';
      return '  <rect width="' + W + '" height="' + H + '"' + (shape === 'rounded' ? ' rx="' + num(clamp(o.radius, 0, 0.5, 0.22) * Math.min(W, H)) + '"' : '') + ' fill="' + paint + '"' + (extra || '') + '/>';
    };

    const s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">');
    s.push('  <title>' + esc(label) + '</title>');
    if (background === 'gradient' || pattern !== 'none' || grain) {
      s.push('  <defs>');
      if (background === 'gradient') gradientDef(W, H, o.angle, t.bg, hex(o.bg2, mix(t.bg, accent, 0.35))).forEach(function (d) { s.push('    ' + d); });
      if (pattern !== 'none') {
        s.push('    <pattern id="ctq-logo-pattern" width="' + num(cell) + '" height="' + num(cell) + '" patternUnits="userSpaceOnUse">');
        s.push('      ' + patternTile(pattern, cell, t.ink, t.opacity.grid * clamp(o.patternStrength, 0, 10, 1)));
        s.push('    </pattern>');
      }
      if (grain) s.push('    <filter id="ctq-logo-grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/></filter>');
      s.push('  </defs>');
    }
    if (background !== 'none') {
      s.push(plate(fill));
      if (pattern !== 'none') s.push(plate('url(#ctq-logo-pattern)'));
      if (grain) s.push('  <g opacity="' + op(grain * 0.3) + '">' + plate('#000', ' filter="url(#ctq-logo-grain)"').trim() + '</g>');
    }
    body.forEach(function (b) { s.push('  ' + b); });
    s.push('</svg>');
    return s.join('\n') + '\n';
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
    const anim = animationOf(o, o.wordmark);

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
    if (fill === 'gradient') defs.push.apply(defs, gradientDef(W, H, o.angle, t.bg, hex(o.bg2, mix(t.bg, accent, 0.35))));
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
      const e = extra(anim, 'corners');
      s.push('');
      if (e.open) s.push('  ' + e.open);
      s.push('  <g fill="none" stroke="' + t.ink + '" stroke-opacity="' + opacity.corners + '" stroke-width="' + num(1.25 * Math.max(1, f)) + '" stroke-linecap="square">');
      s.push('    <path d="M' + num(l) + ' ' + num(top + arm) + ' V' + num(top) + ' H' + num(l + arm) + '"/>');
      s.push('    <path d="M' + num(r - arm) + ' ' + num(top) + ' H' + num(r) + ' V' + num(top + arm) + '"/>');
      s.push('    <path d="M' + num(r) + ' ' + num(bot - arm) + ' V' + num(bot) + ' H' + num(r - arm) + '"/>');
      s.push('    <path d="M' + num(l + arm) + ' ' + num(bot) + ' H' + num(l) + ' V' + num(bot - arm) + '"/>');
      s.push('  </g>');
      if (e.close) s.push('  ' + e.close);
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
      const e = extra(anim, 'overline');
      if (e.open) s.push(pad + e.open);
      s.push(pad + '<text x="' + num(overX) + '" y="78" fill="' + t.ink + '" fill-opacity="' + opacity.overline + '"');
      s.push(pad + '      font-family="' + esc(font) + '"');
      s.push(pad + '      font-size="13" font-weight="500" letter-spacing="5.2" text-anchor="' + anchor + '">' + esc(overline) + '</text>');
      if (e.close) s.push(pad + e.close);
      s.push('');
    }
    if (wm.placed.length) {
      s.push(pad + '<g transform="translate(' + num(wmX) + ' 118) scale(' + WORDMARK_SCALE + ')" fill="none" stroke="' + t.ink + '" stroke-width="' + num(weight) + '" stroke-linecap="round" stroke-linejoin="round">');
      s.push.apply(s, wordmarkShapes(wm.placed, accent, pad + '  ', anim));
      s.push(pad + '</g>');
      s.push('');
    }
    if (o.rule) {
      const e = extra(anim, 'rule', (rule[0] + rule[1]) / 2);
      s.push(pad + e.open + '<path d="M' + num(rule[0]) + ' 272 H' + num(rule[1]) + '" stroke="' + t.ink + '" stroke-opacity="' + opacity.rule + '" stroke-width="1"/>' + e.close);
      s.push('');
    }
    if (motto) {
      const e = extra(anim, 'motto');
      if (e.open) s.push(pad + e.open);
      s.push(pad + '<text x="' + num(mottoX) + '" y="311" fill="' + t.ink + '" fill-opacity="' + opacity.motto + '"');
      s.push(pad + '      font-family="' + esc(font) + '"');
      s.push(pad + '      font-size="18" font-weight="500" letter-spacing="6.4" text-anchor="' + anchor + '">' + esc(motto) + '</text>');
      if (e.close) s.push(pad + e.close);
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
    renderLogo: renderLogo,
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
    LOGO_TYPES: LOGO_TYPES,
    LOGO_DEFAULTS: LOGO_DEFAULTS,
    CHARACTERS: Object.keys(GLYPHS).join(''),
    ANIMATIONS: ANIMATIONS,
    ANIMATION_KINDS: ANIMATION_KINDS,
    ANIMATION_END: LOOP.end,
    ORDERS: ORDERS,
    EASINGS: Object.keys(EASINGS),
    animationSpan: animationSpan,
    staggerDefault: staggerDefault,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CartiqoBanner = api;
})(this);
