// Draws icons for the Icon tab: a Lucide glyph on a shape, as an SVG string.
// It works without the page, so it can move into @cartiqo/brand later.
(function (root) {
  'use strict';

  // Everything is drawn on a 512 × 512 board and scaled to the export size.
  const BOARD = 512;
  const MID = BOARD / 2;

  const SHAPES = [
    { id: 'square', name: 'Square' },
    { id: 'rounded', name: 'Rounded' },
    { id: 'squircle', name: 'Squircle' },
    { id: 'circle', name: 'Circle' },
    { id: 'hexagon', name: 'Hexagon' },
  ];

  // Presets use the CARTIQO colours from banner.js. `bg2` makes a gradient.
  const PRESETS = [
    { id: 'violet', name: 'Violet', iconShape: 'squircle', iconFill: 'solid', iconBg: '#7C5CFF', iconInk: '#FFFFFF', iconRing: 0 },
    { id: 'onyx', name: 'Onyx', iconShape: 'squircle', iconFill: 'solid', iconBg: '#0E1013', iconInk: '#F4F4F6', iconRing: 1, iconRingInk: '#7C5CFF', iconRingInset: 3 },
    { id: 'dusk', name: 'Dusk', iconShape: 'circle', iconFill: 'gradient', iconBg: '#7C5CFF', iconBg2: '#0A0F24', iconAngle: 135, iconInk: '#FFFFFF', iconRing: 0 },
    { id: 'paper', name: 'Paper', iconShape: 'rounded', iconFill: 'solid', iconBg: '#FFFAFA', iconInk: '#111113', iconRing: 1, iconRingInk: '#E3DEDE', iconRingInset: 0 },
    { id: 'midnight', name: 'Midnight', iconShape: 'rounded', iconFill: 'solid', iconBg: '#0A0F24', iconInk: '#7D97FF', iconRing: 0 },
    { id: 'graphite', name: 'Graphite', iconShape: 'hexagon', iconFill: 'solid', iconBg: '#25282F', iconInk: '#C3C8D2', iconRing: 1, iconRingInk: '#C3C8D2', iconRingInset: 3 },
    { id: 'linen', name: 'Linen', iconShape: 'circle', iconFill: 'solid', iconBg: '#F2EDE4', iconInk: '#1C1A17', iconRing: 0 },
    { id: 'plain', name: 'Plain', iconShape: 'squircle', iconFill: 'none', iconBg: '#7C5CFF', iconInk: '#7C5CFF', iconRing: 0 },
  ];

  // Categories match whole words in an icon's name, so "cat" finds cat-face
  // but not category.
  const CATEGORIES = [
    ['Emblems', 'crown shield badge award medal trophy star sparkle sparkles gem diamond flame zap crosshair target hexagon heart skull swords sword ribbon stamp key infinity atom orbit fingerprint wand'],
    ['Gaming', 'gamepad gamepad-2 joystick dice dice-1 dice-2 dice-3 dice-4 dice-5 dice-6 dices puzzle ghost bot rocket swords bomb flag castle chess-king chess-queen chess-knight chess-rook chess-pawn chess-bishop hourglass trophy'],
    ['Nature', 'leaf tree trees flower sprout clover wheat cactus palmtree mountain waves droplet sun sunrise sunset moon cloud rainbow snowflake wind earth globe cat dog bird fish rabbit turtle bug snail squirrel rat panda paw-print worm shell feather'],
    ['Tech', 'cpu code terminal server database hard-drive binary braces wifi bluetooth router network cable usb monitor laptop smartphone tablet keyboard mouse printer qr-code git github webhook command plug power battery container blocks component layers package'],
    ['Media', 'music headphones headset mic speaker volume disc radio piano guitar drum camera video film clapperboard tv play pause podcast image images aperture'],
    ['People', 'user users contact baby accessibility graduation-cap hand handshake thumbs-up smile frown laugh angry meh brain ear eye id-card'],
    ['Messages', 'message message-circle message-square mail inbox send bell megaphone speech phone at-sign hash reply forward share link rss signal'],
    ['Money', 'coins banknote credit-card wallet piggy-bank dollar-sign euro pound-sterling bitcoin receipt shopping-bag shopping-cart store tag ticket percent gift'],
    ['Travel', 'plane car bus train truck bike ship sailboat anchor rocket map compass navigation route milestone signpost tent caravan tram'],
    ['Interface', 'house search settings cog sliders filter layout grid list menu plus minus check info circle-help ban calendar clock timer upload download refresh-cw copy clipboard file folder save pencil trash archive bookmark pin lock'],
  ].map(function (c) {
    const words = c[1].split(' ');
    return { name: c[0], test: new RegExp('(^|-)(' + words.map(function (w) { return w.replace(/[-]/g, '\\-'); }).join('|') + ')(-|$)') };
  });

  const DEFAULTS = {
    iconName: 'sparkles',
    iconShape: 'squircle',
    iconRadius: 22,
    iconFill: 'solid',
    iconBg: '#7C5CFF',
    iconBg2: '#0A0F24',
    iconAngle: 135,
    iconInk: '#FFFFFF',
    iconScale: 56,
    iconStroke: 2,
    iconRotate: 0,
    iconRing: 0,
    iconRingInk: '#B69BFF',
    iconRingInset: 2,
    iconSize: 256,
  };

  const esc = function (v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  const n = function (v) { return Math.round(v * 100) / 100; };

  // The outline of a shape, `inset` units in from the edge of the board.
  function shapePath(shape, inset, radius) {
    const lo = inset;
    const hi = BOARD - inset;
    const half = MID - inset;
    if (half <= 0) return '';
    if (shape === 'circle') {
      return 'M' + n(MID - half) + ' ' + MID + 'a' + n(half) + ' ' + n(half) + ' 0 1 0 ' + n(half * 2) + ' 0a' + n(half) + ' ' + n(half) + ' 0 1 0 ' + n(-half * 2) + ' 0Z';
    }
    if (shape === 'squircle' || shape === 'hexagon') {
      const pts = [];
      if (shape === 'hexagon') {
        // Flat sides left and right, points top and bottom, with slightly
        // rounded corners from a short line either side of each point.
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 3 * i - Math.PI / 2;
          pts.push([MID + half * Math.cos(a), MID + half * Math.sin(a)]);
        }
        const r = 0.12;
        let d = '';
        pts.forEach(function (p, i) {
          const prev = pts[(i + 5) % 6];
          const next = pts[(i + 1) % 6];
          const a = [p[0] + (prev[0] - p[0]) * r, p[1] + (prev[1] - p[1]) * r];
          const b = [p[0] + (next[0] - p[0]) * r, p[1] + (next[1] - p[1]) * r];
          d += (i ? 'L' : 'M') + n(a[0]) + ' ' + n(a[1]) + 'Q' + n(p[0]) + ' ' + n(p[1]) + ' ' + n(b[0]) + ' ' + n(b[1]);
        });
        return d + 'Z';
      }
      // A superellipse, the soft square app icons use.
      const steps = 120;
      const e = 2 / 5;
      for (let i = 0; i < steps; i++) {
        const t = i / steps * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        pts.push([MID + half * Math.sign(c) * Math.pow(Math.abs(c), e), MID + half * Math.sign(s) * Math.pow(Math.abs(s), e)]);
      }
      return 'M' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join('L') + 'Z';
    }
    const r = shape === 'rounded' ? Math.max(0, radius / 100 * MID - inset) : 0;
    if (!r) return 'M' + n(lo) + ' ' + n(lo) + 'H' + n(hi) + 'V' + n(hi) + 'H' + n(lo) + 'Z';
    return 'M' + n(lo + r) + ' ' + n(lo) + 'H' + n(hi - r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(hi) + ' ' + n(lo + r) +
      'V' + n(hi - r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(hi - r) + ' ' + n(hi) +
      'H' + n(lo + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(lo) + ' ' + n(hi - r) +
      'V' + n(lo + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(lo + r) + ' ' + n(lo) + 'Z';
  }

  // `glyph` is the markup inside a Lucide 24 × 24 svg, or '' to draw only the shape.
  // Ring width and inset are in pixels at 64 × 64, the size icons are most often used at.
  function render(o, glyph) {
    o = Object.assign({}, DEFAULTS, o);
    const size = Math.max(16, Math.min(4096, Math.round(o.iconSize)));
    const unit = BOARD / 64;
    const parts = [];
    let defs = '';
    if (o.iconFill !== 'none') {
      let paint = esc(o.iconBg);
      if (o.iconFill === 'gradient') {
        const a = (o.iconAngle - 90) * Math.PI / 180;
        const x = Math.cos(a) / 2;
        const y = Math.sin(a) / 2;
        defs = '<defs><linearGradient id="ctq-icon-fill" x1="' + n(0.5 - x) + '" y1="' + n(0.5 - y) + '" x2="' + n(0.5 + x) + '" y2="' + n(0.5 + y) + '">' +
          '<stop offset="0" stop-color="' + esc(o.iconBg) + '"/><stop offset="1" stop-color="' + esc(o.iconBg2) + '"/></linearGradient></defs>';
        paint = 'url(#ctq-icon-fill)';
      }
      parts.push('<path d="' + shapePath(o.iconShape, 0, o.iconRadius) + '" fill="' + paint + '"/>');
    }
    if (o.iconRing > 0) {
      const w = o.iconRing * unit;
      const d = shapePath(o.iconShape, o.iconRingInset * unit + w / 2, o.iconRadius);
      if (d) parts.push('<path d="' + d + '" fill="none" stroke="' + esc(o.iconRingInk) + '" stroke-width="' + n(w) + '"/>');
    }
    if (glyph) {
      const k = BOARD * o.iconScale / 100 / 24;
      parts.push('<g transform="translate(' + MID + ' ' + MID + ') rotate(' + n(o.iconRotate) + ') scale(' + n(k) + ') translate(-12 -12)" color="' + esc(o.iconInk) +
        '" fill="none" stroke="currentColor" stroke-width="' + n(o.iconStroke) + '" stroke-linecap="round" stroke-linejoin="round">' + glyph + '</g>');
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + BOARD + ' ' + BOARD + '">' +
      '<title>' + esc(o.iconName) + '</title>' + defs + parts.join('') + '</svg>';
  }

  root.CartiqoIcon = { DEFAULTS: DEFAULTS, SHAPES: SHAPES, PRESETS: PRESETS, CATEGORIES: CATEGORIES, render: render, shapePath: shapePath };
})(this);
