# cartiqo-brand

CARTIQO banners, logos and rank cards from code, the command line or a web address. You get SVG, PNG, GIF or animated PNG, drawn with the same strokes as the CARTIQO logo.

![A rank card for Nova: level 12, rank 3, 1,250 of 2,000 XP](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/rank-card.png)

Want to design first? Open the [banner and logo maker](https://cartiqolabs.github.io/.github/), set things up the way you like, and press **Copy code**. You get the exact code for this package.

**Contents**

1. [Install](#install)
2. [Your first banner](#1-your-first-banner)
3. [A rank card for your Discord bot](#2-a-rank-card-for-your-discord-bot)
4. [Logos and icons](#3-logos-and-icons)
5. [Animations](#4-animations)
6. [The HTTP API](#5-the-http-api)
7. [The command line](#6-the-command-line)
8. [All the options](#7-all-the-options)
9. [Pictures, fonts and limits](#8-pictures-fonts-and-limits)

## Install

```bash
npm install cartiqo-brand
```

You need Node 18 or newer. PNGs are drawn with [resvg](https://github.com/yisibl/resvg-js), which comes ready-made for Windows, macOS and Linux, so there is nothing to compile.

## 1. Your first banner

```js
import { banner } from 'cartiqo-brand';
import { writeFile } from 'node:fs/promises';

const png = await banner({ motto: 'Honest by default' });
await writeFile('banner.png', png);
```

![The CARTIQO banner](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/banner.png)

That is the banner at the top of the [CARTIQO Labs](https://github.com/cartiqolabs) profile, 1280 × 360 pixels. Some things to try:

```js
await banner({ theme: 'light' });                  // dark, light, black, midnight, graphite, paper, violet
await banner({ preset: 'discord-server' });        // 960 × 540, see the presets below
await banner({ width: 1600, height: 400 });        // any size
await banner({ scale: 2 });                        // a 2× PNG, sharp on dense screens
await banner({ wordmark: 'CARTIQO LABS.', accent: 'chat', fill: 'gradient' });
const svg = await banner({ format: 'svg' });       // SVG comes back as a string
```

Every maker returns a Promise. For `png`, `gif` and `apng` you get a Buffer; for `svg` you get a string. Using CommonJS? `const { banner } = require('cartiqo-brand')` works too.

**Presets:** `github` (1280 × 360), `github-social` (1280 × 640), `og` (1200 × 630), `x` (1500 × 500), `linkedin` (1584 × 396), `youtube` (2560 × 1440), `discord-server` (960 × 540), `discord-invite` (1920 × 1080), `discord-profile` (1200 × 480), `discord-embed` (1200 × 600), `email` (1200 × 400), `square` (1080 × 1080) and `story` (1080 × 1920).

## 2. A rank card for your Discord bot

Here is a complete `/rank` command for [discord.js](https://discord.js.org) v14. Swap `getXp` for however your bot stores XP:

```js
import { AttachmentBuilder } from 'discord.js';
import { rankCard } from 'cartiqo-brand';

export async function rank(interaction) {
  const user = interaction.options.getUser('member') ?? interaction.user;
  const { level, xp, xpNeeded, place } = await getXp(interaction.guildId, user.id);

  const png = await rankCard({
    username: user.displayName,
    subtitle: interaction.guild.name,
    avatar: user.displayAvatarURL({ size: 256 }),
    level,
    rank: place,
    xp,
    xpNeeded,
    accent: '#5865F2', // the server's colour, or a CARTIQO accent like 'chat'
  });

  await interaction.reply({ files: [new AttachmentBuilder(png, { name: 'rank.png' })] });
}
```

![Two rank cards: Nova on the dark theme, Mika on the light theme](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/rank-card-light.png)

What the numbers mean:

- `level` is the level the member is on.
- `xp` is how far into that level they are, and `xpNeeded` is what the whole level takes. Someone 1,250 XP into a 2,000 XP level gets `xp: 1250, xpNeeded: 2000`, and the card says "750 XP to level 13".
- `rank` is their place on the leaderboard. Leave it out, or pass `0`, to hide it.

If you only store each member's **total** XP, this works out the level and progress. It uses the curve most level bots use (5 × level² + 50 × level + 100 XP per level):

```js
function levelFromXp(total) {
  const needed = (level) => 5 * level * level + 50 * level + 100;
  let level = 0;
  let xp = total;
  while (xp >= needed(level)) {
    xp -= needed(level);
    level++;
  }
  return { level, xp, xpNeeded: needed(level) };
}
```

Good to know:

- **Avatars:** discord.js gives WebP links, which can't be drawn, so the package asks Discord for PNG on its own. You can also pass a file path or a Buffer.
- **Status:** `status: 'online'` adds a dot (also `idle`, `dnd`, `streaming` and `offline`). Reading a member's real status needs the Guild Presences intent.
- **Inside an embed:** attach the file and point the embed at it: `embeds: [{ image: { url: 'attachment://rank.png' } }]`.
- **A filling bar:** `animate: 'fill', format: 'gif'` makes the bar fill up, as below.

![The XP bar filling up](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/rank-card-fill.gif)

## 3. Logos and icons

```js
import { logo } from 'cartiqo-brand';

const wordmark = await logo();                                                // CARTIQO., see-through, 256 pixels tall
const icon = await logo({ type: 'icon', background: 'solid', size: 512 });    // a server icon or avatar
const round = await logo({ type: 'icon', background: 'solid', shape: 'circle', theme: 'violet' });
const lockup = await logo({ type: 'lockup', motto: 'Honest by default' });   // with the two lines
```

![The CARTIQO icon](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/icon.png) ![The CARTIQO wordmark](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/wordmark.png)

For a wordmark or lockup, `size` is the height; the width follows the text. For an icon, `size` is both width and height, and `mark` is what it shows (default `C.`).

## 4. Animations

Set `animate` and ask for a `gif` or `apng`:

```js
const gif = await banner({ animate: 'draw', format: 'gif' });
const apng = await logo({ type: 'icon', background: 'solid', animate: 'pop', easing: 'springy', format: 'apng' });
```

![The banner drawing itself](https://raw.githubusercontent.com/cartiqolabs/.github/main/packages/brand/examples/banner-draw.gif)

| `animate` | What it does |
|---|---|
| `draw` | Draws the strokes |
| `rise`, `drop`, `slide` | Letters move in |
| `pop` | Letters grow in |
| `fade`, `blur`, `type`, `flicker` | Letters appear: fading, coming into focus, one at a time, or like neon |
| `wave` | A ripple runs through the letters, all the time |
| `pulse` | The dot beats, all the time |

You can fine-tune it with:
- `order`: `ltr`, `rtl`, `centre`, `edges` or `random`
- `stagger`: 0 moves everything together, 1 moves letters strictly one by one
- `easing`: `smooth`, `snappy`, `springy` or `linear`
- `intensity`: how far things move
- `exit`: `together` or `reverse`
- `duration`: seconds per loop
- `animateLines`, `animateRule` and `animateCorners`: animate the lines, divider and corner marks too

By default an animation loops. `loop: false` plays it once and stops on the finished look.

GIF plays almost everywhere but has 256 colours. An animated PNG (`apng`) has full colour and smooth transparency, and plays in browsers and on GitHub. A PNG of an animated design shows the finished look. An animated `svg` plays in browsers too.

## 5. The HTTP API

Every image is also a web address, so anything that can load a picture can use it: a website, a Discord embed, a README.

```bash
npx cartiqo-brand serve --port 3000
```

Then open:

```
http://localhost:3000/banner.png?motto=Honest%20by%20default&theme=light
http://localhost:3000/logo.svg?type=icon&background=solid
http://localhost:3000/rank-card.png?username=Nova&level=12&rank=3&xp=1250&xpNeeded=2000
http://localhost:3000/banner.gif?animate=draw
```

- **Addresses:** each one is `/<banner|logo|rank-card>.<png|svg|gif|apng>`. The options are the same as in JavaScript, written as query parameters.
- **POST:** you can also send the options as a JSON body. That helps when the text is long.
- **Mistakes:** an unknown option, a wrong value or a picture that can't be loaded gets a `400` with a readable `{ "error": "…" }`.
- **Listing:** `/` lists every option, and `/health` answers `{ "ok": true }`.

The **Copy API URL** button in the web maker gives you the address for whatever you designed.

**Pictures from the web.** By default the API only fetches avatars and background pictures from Discord (`cdn.discordapp.com` and `media.discordapp.net`). That stops it being used to reach other servers. You can allow more hosts, or any host:

```bash
npx cartiqo-brand serve --allow-image-host cdn.discordapp.com --allow-image-host i.imgur.com
npx cartiqo-brand serve --any-image-host   # only behind a login or on a private network
```

**Inside your own server.** `createHandler()` works with Node's `http`, Express and Fastify. Addresses it doesn't know go on to the next handler.

```js
import { createHandler } from 'cartiqo-brand';

// Node
import http from 'node:http';
http.createServer(createHandler()).listen(3000);

// Express: images at /brand/banner.png and so on
app.use('/brand', createHandler());

// Fastify
const brand = createHandler({ basePath: '/brand' });
fastify.all('/brand/*', (req, reply) => {
  reply.hijack();
  req.raw.body = req.body; // Fastify has already read the body
  brand(req.raw, reply.raw);
});
```

| Setting | Default | What it does |
|---|---|---|
| `basePath` | `''` | Where the API lives, e.g. `'/brand'` |
| `allowImageHosts` | Discord's CDN | Hosts pictures may come from, or `'*'` for any |
| `cacheSeconds` | `86400` | How long browsers and CDNs may keep an image |
| `cors` | `true` | Lets any website load the images |
| `maxBodyBytes` | 1 MB | The largest JSON body a POST may send |

**Running it for real.** Put it behind your web server (nginx, Caddy) over HTTPS. Images are cached for a day, so a CDN in front saves work. Drawing happens on the CPU: a PNG takes a few milliseconds, and a GIF takes a second or more. If the API is public, rate-limit it.

## 6. The command line

```bash
npx cartiqo-brand banner --motto "Honest by default" --theme light -o banner.png
npx cartiqo-brand banner --preset x --animate draw -o header.gif
npx cartiqo-brand logo --type icon --background solid --size 512 -o icon.png
npx cartiqo-brand rank-card --username Nova --level 12 --rank 3 --xp 1250 --xp-needed 2000 --avatar ./nova.png -o rank.png
```

Options are the JavaScript ones written `--like-this`, and `--no-border` switches one off. The file name picks the format (`.png`, `.svg` or `.gif`); use `--format apng` for an animated PNG. `npx cartiqo-brand options rank-card` lists every option and `npx cartiqo-brand presets` lists the sizes.

## 7. All the options

Every option is optional. These work everywhere:

| Option | Default | |
|---|---|---|
| `format` | `'png'` | `png`, `svg`, `gif` or `apng` |
| `scale` | `1` | Pixel density for PNG, GIF and APNG, 0.25 to 4 |
| `fps` | `25` | Frames a second for GIF and APNG |
| `theme` | `'dark'` | `dark`, `light`, `black`, `midnight`, `graphite`, `paper`, `violet`, or `custom` with `bg` and `ink` |
| `accent` | `'cartiqo'` | The dot's colour: `cartiqo`, `store`, `chat`, `club`, `mail`, `forum`, `wiki`, `review`, `labs` or any `#rrggbb` |

**Backgrounds** (banners and rank cards):

| Option | Default | |
|---|---|---|
| `fill` | `'solid'` | `solid`, `gradient`, `glow` or `image` |
| `bg2`, `angle` | automatic, `135` | Where a gradient fades to, and which way |
| `glow`, `glowAt` | `0.35`, `'centre'` | How strong the glow is, and where it comes from |
| `image`, `dim`, `blur` | none, `0.6`, `0` | A background picture, how much to darken it and how much to blur it. Setting `image` turns on the image fill |
| `pattern` | `'grid'` | `grid`, `dots`, `crosses`, `lines`, `diagonal` or `none` |
| `patternSize`, `patternStrength` | `1`, `1` | |
| `grain` | `0` | Film grain, 0 to 1 |

**Banners:**

| Option | Default | |
|---|---|---|
| `preset`, `width`, `height` | `github` | A preset, or a size in pixels |
| `wordmark` | `'CARTIQO.'` | A–Z, 0–9, space and `. - / ! ' #`. A full stop becomes the accent dot |
| `overline`, `motto` | `'One account · eight products'`, `'Honest by default'` | The two lines |
| `font`, `caps` | `'sans'`, `true` | The lines' font (`sans`, `mono`, `serif`) and whether they are in capitals |
| `align` | `'center'` | `left`, `center` or `right` |
| `contentSize` | `1` | How big the content is |
| `weight`, `tracking` | `4`, `0` | Wordmark stroke weight and letter spacing |
| `corners`, `rule`, `border` | `true` | Corner marks, the divider and the thin border |

**Logos:**

| Option | Default | |
|---|---|---|
| `type` | `'wordmark'` | `wordmark`, `icon` or `lockup` |
| `size` | `256` | Height in pixels; an icon's width too |
| `mark` | `'C.'` | What an icon shows |
| `background` | `'none'` | `none`, `solid` or `gradient` |
| `shape`, `radius` | `'rounded'`, `0.22` | `square`, `rounded` or `circle` (icons), and the corner radius as a share of the shorter side |
| `padding` | `0.12` | Space around the logo as a share of its height |
| `pattern`, `grain` | `'none'`, `0` | For logos with a background |
| `wordmark`, `overline`, `motto`, `font`, `caps`, `weight`, `tracking`, `rule` | | As for banners |

**Rank cards** (960 × 300 at scale 1):

| Option | Default | |
|---|---|---|
| `username` | `'Member'` | Long names are shortened with … |
| `subtitle` | none | A second line, like the server's name |
| `avatar` | none | A picture; without one the card shows the name's first letter |
| `status` | `'none'` | `online`, `idle`, `dnd`, `streaming` or `offline` |
| `level`, `rank` | `1`, `1` | `rank: 0` hides the rank |
| `xp`, `xpNeeded` | `0`, `100` | Progress into the level, and what the level takes |
| `radius`, `border` | `24`, `true` | Corner radius in pixels, and the border |
| `weight` | `4` | Stroke weight of the big numbers |
| `watermark` | `false` | A small CARTIQO. in the corner |
| `animate` | `'none'` | `fill` fills the bar up |

**Animations** (banners and logos): `animate`, `duration`, `loop`, `order`, `stagger`, `easing`, `exit`, `intensity`, `animateLines`, `animateRule` and `animateCorners`, as in [section 4](#4-animations).

If you're using TypeScript, every option is typed and your editor will complete them.

## 8. Pictures, fonts and limits

- **Pictures:** PNG, JPEG, GIF (first frame) and SVG, as a web address, a file path, a data: URL or a Buffer. WebP can't be drawn, except that Discord links are fetched as PNG automatically. Pictures can be up to 8 MB, and fetching gives up after 8 seconds. The HTTP API never reads files.
- **Fonts:** Geist (by Vercel, under the SIL Open Font License) comes with the package, so text looks the same on every machine. Emoji, Japanese, Chinese, Arabic and other scripts Geist doesn't cover use the computer's own fonts. A bare Linux server may have none, so install some (on Debian or Ubuntu: `apt install fonts-noto-core fonts-noto-cjk`). Emoji are drawn in one colour. The `serif` font uses Georgia when the machine has it.
- **Limits:**
  - PNGs up to 40 megapixels, and banners from 16 to 6000 pixels a side. Logos are 16 to 4096 pixels.
  - GIFs and animated PNGs are scaled down to fit 2560 × 1440 at most, because they are encoded in JavaScript.
- **Same as the website:** the package uses the same renderer as the [banner and logo maker](https://cartiqolabs.github.io/.github/), so what you design there is what you get here.

## License

The code is under the MIT license. The bundled Geist fonts are under the SIL Open Font License 1.1 (see `fonts/OFL.txt`).
