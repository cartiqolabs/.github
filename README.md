# cartiqolabs/.github

The CARTIQO Labs organisation profile and the tools that go with it.

- `profile/README.md` is the page at [github.com/cartiqolabs](https://github.com/cartiqolabs). Its banner is in `profile/assets/`.
- `docs/` is the banner, logo and rank card maker, live at [cartiqolabs.github.io/.github](https://cartiqolabs.github.io/.github/). GitHub Pages serves it from this folder on `main`.
- `packages/brand/` is the [cartiqo-brand](packages/brand#readme) npm package: the same images from JavaScript, the command line or an HTTP API, with a step-by-step guide.

## How it fits together

`docs/banner.js` draws the banners, logos and rank cards as SVG, and `docs/encoders.js` turns frames into GIF, animated PNG and ICO files without any libraries. The website loads both. The npm package copies them into `packages/brand/lib/` and adds PNG drawing, picture loading, the HTTP API and the command line.

After changing either file in `docs/`, run this to update the package's copy (publishing refuses to run if the copy is stale):

```bash
cd packages/brand && npm run sync && npm test
```

With no options, `render` draws the profile banner exactly, and the package's tests check that. The wordmark is drawn from the same strokes as the CARTIQO logo, with every letter A to Z, the numbers and `. - / ! ' #`. A full stop becomes the accent dot.
