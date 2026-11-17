# cartiqolabs/.github

The CARTIQO Labs organisation profile and the tools that go with it.

- `profile/README.md` is the page at [github.com/cartiqolabs](https://github.com/cartiqolabs). Its banner is in `profile/assets/`.
- `docs/` is the banner, logo, rank card and icon maker, live at [cartiqolabs.com/studio](https://cartiqolabs.com/studio/). GitHub Pages still publishes it from this folder on `main`, with no build step, and cartiqolabs.com serves those files at /studio (the Pages worker in cartiqolabs/cartiqo). Opened on github.io, the page sends people to cartiqolabs.com/studio/.
- `packages/brand/` is the [@cartiqo/brand](https://www.npmjs.com/package/@cartiqo/brand) npm package: the same images from JavaScript, the command line or an HTTP API, with a step-by-step guide.

## How it fits together

`docs/banner.js` draws the banners, logos and rank cards as SVG, and `docs/encoders.js` turns frames into GIF, animated PNG and ICO files without any libraries. The website loads both. The npm package copies them into `packages/brand/lib/` and adds PNG drawing, picture loading, the HTTP API and the command line.

The Icon tab draws with `docs/icon.js` and the [Lucide](https://lucide.dev) icons in `docs/vendor/lucide.js` (ISC licence, copied next to it as `lucide-LICENSE.txt`). The icons load the first time someone opens the tab. To move to a newer Lucide, unpack its `lucide-static` package and run:

```bash
npm pack lucide-static@1.39.0 && tar xzf lucide-static-1.39.0.tgz && node scripts/vendor-lucide.mjs ./package
```

After changing `banner.js` or `encoders.js` in `docs/`, run this to update the package's copy (publishing refuses to run if the copy is stale):

```bash
cd packages/brand && npm run sync && npm test
```

With no options, `render` draws the profile banner exactly, and the package's tests check that. The wordmark is drawn from the same strokes as the CARTIQO logo, with every letter A to Z, the numbers and `. - / ! ' #`. A full stop becomes the accent dot.
