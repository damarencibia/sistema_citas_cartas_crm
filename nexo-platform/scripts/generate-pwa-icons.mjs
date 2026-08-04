import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / (len2 || 1);
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

const BG = [0x19, 0x76, 0xd2];

function drawIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? size * 0.12 : size * 0.2;
  const safePad = maskable ? size * 0.1 : 0;
  const r = radius;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rx = Math.min(x, size - 1 - x);
      const ry = Math.min(y, size - 1 - y);
      const inside =
        rx >= r || ry >= r
          ? true
          : Math.hypot(rx - (r - 0.5), ry - (r - 0.5)) <= r - 0.5;
      if (inside) {
        const i = (y * size + x) * 4;
        rgba[i] = BG[0];
        rgba[i + 1] = BG[1];
        rgba[i + 2] = BG[2];
        rgba[i + 3] = 255;
      }
    }
  }

  const left = size * 0.26;
  const right = size * 0.74;
  const top = size * 0.24;
  const bottom = size * 0.76;
  const stroke = size * 0.17;
  const half = stroke / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < safePad || y < safePad || x >= size - safePad || y >= size - safePad) continue;
      const xc = x + 0.5;
      const yc = y + 0.5;
      const d = Math.min(
        distToSeg(xc, yc, left, top, left, bottom),
        distToSeg(xc, yc, right, top, right, bottom),
        distToSeg(xc, yc, left, top, right, bottom),
      );
      if (d <= half) {
        const i = (y * size + x) * 4;
        rgba[i] = 255;
        rgba[i + 1] = 255;
        rgba[i + 2] = 255;
        rgba[i + 3] = 255;
      }
    }
  }

  return encodePng(size, size, rgba);
}

const targets = [
  ['pwa-64x64.png', 64, false],
  ['pwa-192x192.png', 192, false],
  ['pwa-512x512.png', 512, false],
  ['maskable-icon-512x512.png', 512, true],
  ['apple-touch-icon-180x180.png', 180, false],
  ['favicon-32x32.png', 32, false],
];

for (const [name, size, maskable] of targets) {
  writeFileSync(join(outDir, name), drawIcon(size, maskable));
  console.log(`✓ ${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
}
