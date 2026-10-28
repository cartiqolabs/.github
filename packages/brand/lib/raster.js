'use strict';

// SVG to pixels with resvg, using the bundled Geist fonts. System fonts are
// only loaded when the text needs them (emoji, CJK and other scripts Geist
// does not cover), because loading them takes most of a second.
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const FONT_DIR = path.join(__dirname, '..', 'fonts');
const FONT_FILES = ['Geist-Regular.ttf', 'Geist-Medium.ttf', 'Geist-SemiBold.ttf', 'GeistMono-Medium.ttf'].map(function (f) {
  return path.join(FONT_DIR, f);
});

// Latin, Latin Extended, punctuation, currency and arrows.
const COVERED = /^[\u0000-ɏḀ-ỿ -⁯₠-₿℀-⇿−]*$/;

function needsSystemFonts(svg) {
  if (/font-family="[^"]*Georgia/.test(svg)) return true; // the serif option
  const re = /<text[^>]*>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg))) if (!COVERED.test(m[1])) return true;
  return false;
}

function draw(svg, scale) {
  return new Resvg(svg, {
    fitTo: { mode: 'zoom', value: scale },
    shapeRendering: 2,
    textRendering: 1,
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: needsSystemFonts(svg),
      defaultFontFamily: 'Geist',
      sansSerifFamily: 'Geist',
      monospaceFamily: 'Geist Mono',
    },
  }).render();
}

function png(svg, scale) {
  return draw(svg, scale).asPng();
}

// Straight (not premultiplied) RGBA, which is what the GIF and APNG encoders expect.
function pixels(svg, scale) {
  const img = draw(svg, scale);
  const data = new Uint8ClampedArray(img.pixels);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    data[i] = Math.round(data[i] * 255 / a);
    data[i + 1] = Math.round(data[i + 1] * 255 / a);
    data[i + 2] = Math.round(data[i + 2] * 255 / a);
  }
  return { width: img.width, height: img.height, data: data };
}

module.exports = { png: png, pixels: pixels, FONT_FILES: FONT_FILES };
