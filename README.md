# cartiqolabs/.github

The CARTIQO Labs organisation profile and the tools that go with it.

- `profile/README.md` is the page at [github.com/cartiqolabs](https://github.com/cartiqolabs). Its banner is in `profile/assets/`.
- `docs/` is the banner and logo maker, live at [cartiqolabs.github.io/.github](https://cartiqolabs.github.io/.github/). GitHub Pages serves it from this folder on `main`.

## Banners and logos

`docs/banner.js` draws the banners and logos. The page uses it in the browser, and it runs in Node too:

```js
const { render, renderLogo } = require('./docs/banner.js');
const banner = render({ width: 1500, height: 500, theme: 'light', motto: 'Honest by default' });
const icon = renderLogo({ type: 'icon', background: 'solid', padding: 0.24, size: 512 });
```

`docs/encoders.js` turns frames into GIF, animated PNG and ICO files without any libraries.

With no options `render` draws the profile banner exactly. `renderLogo` makes a `wordmark`, an `icon` or a `lockup` (the wordmark with its two lines). The wordmark is drawn from the same strokes as the CARTIQO logo, with every letter A to Z, the numbers and `. - / ! '`. A full stop becomes the accent dot.
