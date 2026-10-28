'use strict';

// Makes the pictures in the README, with the package itself: npm run examples
const fs = require('node:fs');
const path = require('node:path');
const { banner, logo, rankCard } = require('..');

const dir = path.join(__dirname, '..', 'examples');
const member = { username: 'Nova', subtitle: 'CARTIQO Chat', status: 'online', level: 12, rank: 3, xp: 1250, xpNeeded: 2000 };

(async () => {
  const files = {
    'banner.png': await banner({ motto: 'Honest by default' }),
    'banner-draw.gif': await banner({ animate: 'draw', format: 'gif', scale: 0.5 }),
    'rank-card.png': await rankCard(member),
    'rank-card-light.png': await rankCard(Object.assign({}, member, { username: 'Mika', subtitle: '', status: 'idle', level: 4, rank: 21, xp: 80, xpNeeded: 220, theme: 'light', accent: 'chat' })),
    'rank-card-fill.gif': await rankCard(Object.assign({}, member, { animate: 'fill', format: 'gif', scale: 0.5 })),
    'icon.png': await logo({ type: 'icon', background: 'solid', padding: 0.24, size: 256 }),
    'wordmark.png': await logo({ size: 96 }),
  };
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), data);
    console.log(name, Math.round(Buffer.byteLength(data) / 1024) + ' KB');
  }
})();
