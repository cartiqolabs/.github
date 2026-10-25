/* Image encoders for the banner maker: GIF, animated PNG and ICO.
 *
 * They work on raw RGBA pixels, so they run in the browser and in Node 18+:
 *
 *   const { createGif } = require('./encoders.js');
 *   const gif = createGif(width, height, { palette, loop: true });
 *   gif.addFrame(rgba, 40);
 *   const bytes = gif.finish();
 */
(function (root) {
  'use strict';

  // A growable byte buffer.
  function Bytes() {
    this.a = new Uint8Array(1 << 16);
    this.n = 0;
  }
  Bytes.prototype.reserve = function (k) {
    if (this.n + k <= this.a.length) return;
    let size = this.a.length * 2;
    while (size < this.n + k) size *= 2;
    const b = new Uint8Array(size);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  };
  Bytes.prototype.byte = function (v) { this.reserve(1); this.a[this.n++] = v & 255; };
  Bytes.prototype.u16le = function (v) { this.byte(v); this.byte(v >> 8); };
  Bytes.prototype.u32le = function (v) { this.u16le(v & 0xffff); this.u16le(v >>> 16); };
  Bytes.prototype.u16be = function (v) { this.byte(v >> 8); this.byte(v); };
  Bytes.prototype.u32be = function (v) { this.u16be(v >>> 16); this.u16be(v & 0xffff); };
  Bytes.prototype.bytes = function (arr) { this.reserve(arr.length); this.a.set(arr, this.n); this.n += arr.length; };
  Bytes.prototype.ascii = function (s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); };
  Bytes.prototype.done = function () { return this.a.slice(0, this.n); };

  // GIF and video have no partial transparency. Pixels under half alpha become
  // fully see-through (when `keep` is on); the rest are blended onto `matte`.
  function flatten(rgba, matte, keep) {
    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i + 3];
      if (a === 255) continue;
      if (keep && a < 128) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
        continue;
      }
      const t = a / 255;
      rgba[i] = Math.round(rgba[i] * t + matte[0] * (1 - t));
      rgba[i + 1] = Math.round(rgba[i + 1] * t + matte[1] * (1 - t));
      rgba[i + 2] = Math.round(rgba[i + 2] * t + matte[2] * (1 - t));
      rgba[i + 3] = 255;
    }
    return rgba;
  }

  // A palette of up to `max` colours, found by median cut over 15-bit colour
  // bins. Each bin keeps the average of the real colours in it, so flat brand
  // colours come out exact.
  function Palette(max) {
    this.max = Math.min(255, max || 255);
    this.count = new Float64Array(32768);
    this.sum = new Float64Array(32768 * 3);
    this.colors = null;
    this.lookup = null;
  }

  Palette.prototype.add = function (rgba, step) {
    step = (step || 1) * 4;
    for (let i = 0; i < rgba.length; i += step) {
      if (rgba[i + 3] === 0) continue;
      const bin = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
      this.count[bin]++;
      this.sum[bin * 3] += rgba[i];
      this.sum[bin * 3 + 1] += rgba[i + 1];
      this.sum[bin * 3 + 2] += rgba[i + 2];
    }
  };

  Palette.prototype.build = function () {
    const count = this.count;
    const sum = this.sum;
    const avg = function (bin, c) { return sum[bin * 3 + c] / count[bin]; };
    const bins = [];
    for (let i = 0; i < 32768; i++) if (count[i]) bins.push(i);
    if (!bins.length) bins.push(0), count[0] = 1;

    function spread(box) {
      let best = 0;
      let channel = 0;
      let pixels = 0;
      for (let c = 0; c < 3; c++) {
        let lo = 255;
        let hi = 0;
        for (let i = 0; i < box.length; i++) {
          const v = avg(box[i], c);
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        if (hi - lo > best) { best = hi - lo; channel = c; }
      }
      for (let i = 0; i < box.length; i++) pixels += count[box[i]];
      return { range: best, channel: channel, score: box.length > 1 ? best * Math.sqrt(pixels) : -1, pixels: pixels };
    }

    const boxes = [{ bins: bins, info: spread(bins) }];
    while (boxes.length < this.max) {
      // Split the box with the widest spread, weighted by how much it is used.
      let pick = -1;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].info.score > 0 && (pick < 0 || boxes[i].info.score > boxes[pick].info.score)) pick = i;
      }
      if (pick < 0) break;
      const ch = boxes[pick].info.channel;
      const sorted = boxes[pick].bins.slice().sort(function (a, b) { return avg(a, ch) - avg(b, ch); });
      const half = boxes[pick].info.pixels / 2;
      let acc = 0;
      let cut = 1;
      for (; cut < sorted.length - 1; cut++) {
        acc += count[sorted[cut - 1]];
        if (acc >= half) break;
      }
      const a = sorted.slice(0, cut);
      const b = sorted.slice(cut);
      boxes.splice(pick, 1, { bins: a, info: spread(a) }, { bins: b, info: spread(b) });
    }

    this.colors = new Uint8Array(boxes.length * 3);
    boxes.forEach(function (box, i) {
      let n = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      box.bins.forEach(function (bin) {
        n += count[bin];
        r += sum[bin * 3];
        g += sum[bin * 3 + 1];
        b += sum[bin * 3 + 2];
      }, this);
      this.colors[i * 3] = Math.round(r / n);
      this.colors[i * 3 + 1] = Math.round(g / n);
      this.colors[i * 3 + 2] = Math.round(b / n);
    }, this);
    this.lookup = new Int16Array(32768).fill(-1);
    return this;
  };

  // The palette index nearest to a colour, cached per bin.
  Palette.prototype.index = function (r, g, b) {
    const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let k = this.lookup[bin];
    if (k >= 0) return k;
    const seen = this.count[bin] > 0;
    const R = seen ? this.sum[bin * 3] / this.count[bin] : r;
    const G = seen ? this.sum[bin * 3 + 1] / this.count[bin] : g;
    const B = seen ? this.sum[bin * 3 + 2] / this.count[bin] : b;
    let best = Infinity;
    const c = this.colors;
    for (let i = 0; i < c.length; i += 3) {
      const d = (c[i] - R) * (c[i] - R) * 2 + (c[i + 1] - G) * (c[i + 1] - G) * 4 + (c[i + 2] - B) * (c[i + 2] - B) * 3;
      if (d < best) { best = d; k = i / 3; }
    }
    this.lookup[bin] = k;
    return k;
  };

  // GIF's LZW, after omggif's encoder. Codes go out in 255-byte sub-blocks.
  const lzwStamp = new Int32Array(1 << 20);
  const lzwCode = new Int16Array(1 << 20);
  let lzwGen = 0;

  function lzw(out, pixels, minCode) {
    out.byte(minCode);
    const clear = 1 << minCode;
    const eoi = clear + 1;
    let next = eoi + 1;
    let size = minCode + 1;
    let cur = 0;
    let shift = 0;
    const block = new Uint8Array(255);
    let len = 0;
    function flush() { out.byte(len); out.bytes(block.subarray(0, len)); len = 0; }
    function emit(code) {
      cur |= code << shift;
      shift += size;
      while (shift >= 8) {
        block[len++] = cur & 255;
        cur >>= 8;
        shift -= 8;
        if (len === 255) flush();
      }
    }
    const gen = ++lzwGen;
    let table = gen;
    emit(clear);
    let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const k = pixels[i];
      const key = (prefix << 8) | k;
      if (lzwStamp[key] === table) { prefix = lzwCode[key]; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(clear);
        next = eoi + 1;
        size = minCode + 1;
        table = ++lzwGen;
      } else {
        if (next >= (1 << size)) size++;
        lzwCode[key] = next++;
        lzwStamp[key] = table;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (shift > 0) { block[len++] = cur & 255; if (len === 255) flush(); }
    if (len) flush();
    out.byte(0);
  }

  // A GIF, still or animated. Pass frames through flatten() first. Each frame
  // stores only the rectangle that changed; frames that change nothing just
  // lengthen the one before. With `transparent`, see-through pixels stay
  // see-through and every frame stands alone.
  function createGif(width, height, options) {
    const o = options || {};
    const palette = o.palette;
    const T = 255; // the see-through index
    const out = new Bytes();
    const total = width * height;
    let prev = null;
    let pending = null;
    let frames = 0;

    out.ascii('GIF89a');
    out.u16le(width);
    out.u16le(height);
    out.byte(0xf7); // a 256-colour global table
    out.byte(0);
    out.byte(0);
    for (let i = 0; i < 256; i++) {
      const c = i * 3 < palette.colors.length ? i * 3 : -1;
      out.byte(c < 0 ? 0 : palette.colors[c]);
      out.byte(c < 0 ? 0 : palette.colors[c + 1]);
      out.byte(c < 0 ? 0 : palette.colors[c + 2]);
    }
    if (o.loop) {
      out.byte(0x21); out.byte(0xff); out.byte(11);
      out.ascii('NETSCAPE2.0');
      out.byte(3); out.byte(1); out.u16le(0); out.byte(0);
    }

    function write(f) {
      out.byte(0x21); out.byte(0xf9); out.byte(4);
      out.byte((f.disposal << 2) | (f.see ? 1 : 0));
      out.u16le(Math.max(2, Math.round(f.delay / 10)));
      out.byte(f.see ? T : 0);
      out.byte(0);
      out.byte(0x2c);
      out.u16le(f.x); out.u16le(f.y); out.u16le(f.w); out.u16le(f.h);
      out.byte(0);
      lzw(out, f.pixels, 8);
      frames++;
    }

    function crop(idx, x, y, w, h, keepFrom) {
      const pixels = new Uint8Array(w * h);
      for (let j = 0; j < h; j++) {
        const row = (y + j) * width + x;
        for (let i = 0; i < w; i++) {
          const v = idx[row + i];
          pixels[j * w + i] = keepFrom && keepFrom[row + i] === v ? T : v;
        }
      }
      return pixels;
    }

    function addFrame(rgba, delay) {
      const idx = new Uint8Array(total);
      for (let p = 0, i = 0; p < total; p++, i += 4) {
        idx[p] = rgba[i + 3] === 0 ? T : palette.index(rgba[i], rgba[i + 1], rgba[i + 2]);
      }

      // Where this frame differs from the last one.
      let x0 = width;
      let y0 = height;
      let x1 = -1;
      let y1 = -1;
      if (prev) {
        for (let y = 0; y < height; y++) {
          const row = y * width;
          for (let x = 0; x < width; x++) {
            if (idx[row + x] !== prev[row + x]) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              y1 = y;
            }
          }
        }
        if (x1 < 0) { pending.delay += delay; return; }
      }

      if (pending) write(pending);
      if (o.transparent) {
        // Every frame is cleared after it shows, so it carries all its pixels;
        // it can still skip the see-through margins.
        x0 = width; y0 = height; x1 = -1; y1 = -1;
        for (let y = 0; y < height; y++) {
          const row = y * width;
          for (let x = 0; x < width; x++) {
            if (idx[row + x] !== T) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              y1 = y;
            }
          }
        }
        if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
        pending = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, delay: delay, disposal: 2, see: true };
        pending.pixels = crop(idx, x0, y0, pending.w, pending.h, null);
      } else if (!prev) {
        pending = { x: 0, y: 0, w: width, h: height, delay: delay, disposal: 1, see: false, pixels: idx };
      } else {
        const w = x1 - x0 + 1;
        const h = y1 - y0 + 1;
        pending = { x: x0, y: y0, w: w, h: h, delay: delay, disposal: 1, see: true, pixels: crop(idx, x0, y0, w, h, prev) };
      }
      prev = idx;
    }

    function finish() {
      if (pending) write(pending);
      pending = null;
      out.byte(0x3b);
      return out.done();
    }

    return { addFrame: addFrame, finish: finish, frames: function () { return frames + (pending ? 1 : 0); } };
  }

  // CRC-32, for PNG chunks.
  const CRC = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    CRC[n] = c;
  }
  function crc32(bytes, start, end) {
    let c = -1;
    for (let i = start; i < end; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }

  function chunk(out, type, data) {
    out.u32be(data.length);
    const start = out.n;
    out.ascii(type);
    out.bytes(data);
    out.u32be(crc32(out.a, start, out.n));
  }

  // RGBA pixels as zlib-compressed PNG scanlines. Each row uses whichever of
  // the Sub and Up filters leaves smaller numbers.
  function pngData(rgba, width, height) {
    const stride = width * 4;
    const raw = new Uint8Array((stride + 1) * height);
    const sub = new Uint8Array(stride);
    const up = new Uint8Array(stride);
    for (let y = 0; y < height; y++) {
      const row = y * stride;
      let sumSub = 0;
      let sumUp = 0;
      for (let i = 0; i < stride; i++) {
        const v = rgba[row + i];
        const s = (v - (i >= 4 ? rgba[row + i - 4] : 0)) & 255;
        const u = (v - (y ? rgba[row - stride + i] : 0)) & 255;
        sub[i] = s;
        up[i] = u;
        sumSub += s < 128 ? s : 256 - s;
        sumUp += u < 128 ? u : 256 - u;
      }
      const at = y * (stride + 1);
      raw[at] = sumUp < sumSub ? 2 : 1;
      raw.set(sumUp < sumSub ? up : sub, at + 1);
    }
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  // An animated PNG with full colour and transparency. Like the GIF, each
  // frame stores only the rectangle that changed, and still frames lengthen
  // the one before.
  function createApng(width, height, options) {
    const o = options || {};
    const frames = [];
    let prev = null;
    let work = Promise.resolve();

    function addFrame(rgba, delay) {
      const cur = new Uint32Array(rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + width * height * 4));
      let x0 = 0;
      let y0 = 0;
      let x1 = width - 1;
      let y1 = height - 1;
      if (prev) {
        x0 = width; y0 = height; x1 = -1; y1 = -1;
        for (let y = 0; y < height; y++) {
          const row = y * width;
          for (let x = 0; x < width; x++) {
            if (cur[row + x] !== prev[row + x]) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              y1 = y;
            }
          }
        }
        if (x1 < 0) { frames[frames.length - 1].delay += delay; return work; }
      }
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const part = new Uint8Array(w * h * 4);
      const src = new Uint8Array(cur.buffer);
      for (let j = 0; j < h; j++) part.set(src.subarray(((y0 + j) * width + x0) * 4, ((y0 + j) * width + x0 + w) * 4), j * w * 4);
      const frame = { x: x0, y: y0, w: w, h: h, delay: delay, data: null };
      frames.push(frame);
      prev = cur;
      work = work.then(function () { return pngData(part, w, h); }).then(function (d) { frame.data = d; });
      return work;
    }

    function finish() {
      return work.then(function () {
        const out = new Bytes();
        out.bytes([137, 80, 78, 71, 13, 10, 26, 10]);
        const ihdr = new Bytes();
        ihdr.u32be(width); ihdr.u32be(height);
        ihdr.bytes([8, 6, 0, 0, 0]);
        chunk(out, 'IHDR', ihdr.done());
        const actl = new Bytes();
        actl.u32be(frames.length);
        actl.u32be(o.loop ? 0 : 1);
        chunk(out, 'acTL', actl.done());
        let seq = 0;
        frames.forEach(function (f, i) {
          const fctl = new Bytes();
          fctl.u32be(seq++);
          fctl.u32be(f.w); fctl.u32be(f.h); fctl.u32be(f.x); fctl.u32be(f.y);
          fctl.u16be(Math.min(65535, Math.round(f.delay))); fctl.u16be(1000);
          fctl.byte(0); // leave the frame in place
          fctl.byte(0); // replace what is under it, alpha included
          chunk(out, 'fcTL', fctl.done());
          if (i === 0) {
            chunk(out, 'IDAT', f.data);
          } else {
            const fdat = new Bytes();
            fdat.u32be(seq++);
            fdat.bytes(f.data);
            chunk(out, 'fdAT', fdat.done());
          }
        });
        chunk(out, 'IEND', new Uint8Array(0));
        return out.done();
      });
    }

    return { addFrame: addFrame, finish: finish, frames: function () { return frames.length; } };
  }

  // An ICO holding several PNG images, e.g. 16, 32 and 48 pixels for a favicon.
  function createIco(images) {
    const out = new Bytes();
    out.u16le(0);
    out.u16le(1);
    out.u16le(images.length);
    let offset = 6 + images.length * 16;
    images.forEach(function (img) {
      out.byte(img.size >= 256 ? 0 : img.size);
      out.byte(img.size >= 256 ? 0 : img.size);
      out.byte(0);
      out.byte(0);
      out.u16le(1);
      out.u16le(32);
      out.u32le(img.png.length);
      out.u32le(offset);
      offset += img.png.length;
    });
    images.forEach(function (img) { out.bytes(img.png); });
    return out.done();
  }

  const api = {
    flatten: flatten,
    Palette: Palette,
    createGif: createGif,
    createApng: createApng,
    createIco: createIco,
    pngData: pngData,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CartiqoEncoders = api;
})(this);
