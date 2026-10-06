import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const icons = join(dirname(fileURLToPath(import.meta.url)), "../src-tauri/icons");

/** Decode a non-interlaced 8-bit RGBA PNG into { width, height, getPixel(x,y) }. */
function readRgbaPng(path) {
  const buf = readFileSync(path);
  assert.equal(buf.subarray(0, 8).toString("binary"), "\x89PNG\r\n\x1a\n", `${path} not PNG`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = -1;
  const idat = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      assert.equal(data[12], 0, `${path} interlaced PNG unsupported`);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  assert.equal(bitDepth, 8, `${path} bit depth ${bitDepth}`);
  assert.equal(colorType, 6, `${path} color type ${colorType} (need RGBA)`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let src = 0;
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const row = raw.subarray(src, src + stride);
    src += stride;
    const dest = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? dest[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      let val = row[i];
      if (filter === 1) val = (val + left) & 255;
      else if (filter === 2) val = (val + up) & 255;
      else if (filter === 3) val = (val + ((left + up) >> 1)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        val = (val + pr) & 255;
      } else if (filter !== 0) {
        throw new Error(`${path} unknown PNG filter ${filter}`);
      }
      dest[i] = val;
    }
    prev = Buffer.from(dest);
  }

  return {
    width,
    height,
    getPixel(x, y) {
      const i = (y * width + x) * 4;
      return [out[i], out[i + 1], out[i + 2], out[i + 3]];
    },
  };
}

test("Tauri icons are full-bleed so the OS can apply its squircle", () => {
  for (const name of ["32x32.png", "128x128.png", "128x128@2x.png", "icon.png"]) {
    const im = readRgbaPng(join(icons, name));
    const { width: w, height: h, getPixel } = im;
    const corners = [
      getPixel(0, 0),
      getPixel(w - 1, 0),
      getPixel(0, h - 1),
      getPixel(w - 1, h - 1),
    ];
    assert.ok(
      corners.every((p) => p[3] === 255),
      `${name} transparent corner ${JSON.stringify(corners)}`,
    );
    assert.ok(
      corners.every((p) => p[0] + p[1] + p[2] > 40),
      `${name} dark gutter ${JSON.stringify(corners)}`,
    );
    const mid = getPixel(Math.floor(w / 2), Math.floor(h / 2));
    assert.ok(
      mid[3] === 255 && mid[0] + mid[1] + mid[2] > 40,
      `${name} empty center ${JSON.stringify(mid)}`,
    );
  }
});
