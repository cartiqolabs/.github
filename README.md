# cartiqolabs/.github

The CARTIQO Labs organisation profile and the tools that go with it.

- `profile/README.md` is the page at [github.com/cartiqolabs](https://github.com/cartiqolabs). Its banner is in `profile/assets/`.
- `docs/` is the banner maker, live at [cartiqolabs.github.io/.github](https://cartiqolabs.github.io/.github/). GitHub Pages serves it from this folder on `main`.

## Banner maker

`docs/banner.js` draws the banners. The page uses it in the browser, and it runs in Node too:

```js
const { render } = require('./docs/banner.js');
const svg = render({ width: 1500, height: 500, theme: 'light', motto: 'Honest by default' });
```

With no options it draws the profile banner exactly. The wordmark is drawn from the same strokes as the CARTIQO logo, with every letter A to Z, the numbers and `. - / ! '`. A full stop becomes the accent dot.
