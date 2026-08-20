#!/usr/bin/env node
/**
 * Renders media/icon.png (256x256 RGBA) without any external dependency.
 *
 * macOS has no SVG rasterizer on the default PATH (no rsvg-convert /
 * ImageMagick / Inkscape), and `qlmanage -t` produces a Quick Look
 * *thumbnail* — it insets the artwork and bakes in a drop shadow, which
 * looks wrong once VS Code puts the icon in its own container. So we
 * rasterize here instead: signed-distance fields for the shapes, 1px
 * analytic anti-aliasing, zlib for the IDAT stream.
 *
 * Keep media/icon.svg as the source of truth for the design; this file
 * mirrors the same geometry. Run `node media/build-icon.js` after editing.
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZE = 256;

// ---------------------------------------------------------------- colors

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const BG_TOP = hex("#2A2F3A");
const BG_BOTTOM = hex("#1B1E26");
const DIM = hex("#3E4657");
const CARET = hex("#4FC3F7");
const ACCENT_STOPS = [
  { at: 0.0, rgb: hex("#4FC3F7") },
  { at: 0.55, rgb: hex("#7C6CF5") },
  { at: 1.0, rgb: hex("#B24BF3") },
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function gradient(stops, t) {
  t = clamp01(t);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.at && t <= b.at) {
      const k = (t - a.at) / (b.at - a.at);
      return [
        lerp(a.rgb[0], b.rgb[0], k),
        lerp(a.rgb[1], b.rgb[1], k),
        lerp(a.rgb[2], b.rgb[2], k),
      ];
    }
  }
  return stops[stops.length - 1].rgb;
}

/** Diagonal sweep matching the SVG's linearGradient x1=0 y1=0 x2=1 y2=1. */
const accentAt = (x, y) => gradient(ACCENT_STOPS, (x + y) / (2 * SIZE));

// ------------------------------------------------------- distance fields

/** Signed distance to a rounded rectangle, negative inside. */
function sdRoundRect(px, py, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(px - cx) - (halfW - r);
  const dy = Math.abs(py - cy) - (halfH - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}

/** Signed distance to a capsule (thick line segment with round caps). */
function sdSegment(px, py, ax, ay, bx, by, halfW) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay;
  const h = denom === 0 ? 0 : clamp01((pax * bax + pay * bay) / denom);
  return Math.hypot(pax - bax * h, pay - bay * h) - halfW;
}

const barSdf = (x, y, x0, y0, x1, y1, r) =>
  sdRoundRect(x, y, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, r);

/** 1px analytic anti-aliasing from a signed distance. */
const coverage = (d) => clamp01(0.5 - d);

// ------------------------------------------------------------- rendering

const px = Buffer.alloc(SIZE * SIZE * 4);

function blend(i, rgb, alpha) {
  if (alpha <= 0) return;
  const a = alpha > 1 ? 1 : alpha;
  const dstA = px[i + 3] / 255;
  const outA = a + dstA * (1 - a);
  if (outA <= 0) return;
  for (let c = 0; c < 3; c++) {
    const src = rgb[c];
    const dst = px[i + c];
    px[i + c] = Math.round((src * a + dst * dstA * (1 - a)) / outA);
  }
  px[i + 3] = Math.round(outA * 255);
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const cx = x + 0.5;
    const cy = y + 0.5;

    // background: full-bleed rounded square with a vertical gradient
    const bgA = coverage(sdRoundRect(cx, cy, 128, 128, 128, 128, 52));
    if (bgA > 0) {
      const t = cy / SIZE;
      blend(i, [
        lerp(BG_TOP[0], BG_BOTTOM[0], t),
        lerp(BG_TOP[1], BG_BOTTOM[1], t),
        lerp(BG_TOP[2], BG_BOTTOM[2], t),
      ], bgA);
    }

    // dimmed code lines
    blend(i, DIM, coverage(barSdf(cx, cy, 40, 66, 126, 80, 7)));
    blend(i, DIM, coverage(barSdf(cx, cy, 40, 180, 150, 194, 7)));

    // the active line
    blend(i, accentAt(cx, cy), coverage(barSdf(cx, cy, 40, 121, 110, 137, 8)));

    // jump chevron: two capsules meeting at the point
    const chev = Math.min(
      sdSegment(cx, cy, 132, 96, 186, 129, 10),
      sdSegment(cx, cy, 186, 129, 132, 162, 10),
    );
    blend(i, accentAt(cx, cy), coverage(chev));

    // target caret
    blend(i, CARET, coverage(barSdf(cx, cy, 200, 104, 214, 154, 7)));
  }
}

// ------------------------------------------------------------------ PNG

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: RGBA
// 10..12 stay 0: deflate, adaptive filtering, no interlace

// each scanline is prefixed with filter type 0 (None)
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "icon.png");
fs.writeFileSync(out, png);
console.log(`wrote ${out} (${SIZE}x${SIZE}, ${png.length} bytes)`);
