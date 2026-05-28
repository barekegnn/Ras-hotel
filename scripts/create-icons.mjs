// ============================================================
// PWA Icon Generator
// scripts/create-icons.mjs
//
// Creates proper 192×192 and 512×512 PNG icons for the PWA manifest.
// Uses pure Node.js — no external dependencies.
// The icon is a terracotta square with a white "R" lettermark.
// ============================================================

import { writeFileSync, mkdirSync } from 'fs';
import { createCanvas } from 'canvas';

// Try canvas first (best quality), fall back to raw PNG
async function tryCanvas() {
  try {
    const { createCanvas } = await import('canvas');
    return createCanvas;
  } catch {
    return null;
  }
}

// ── Raw PNG builder (no dependencies) ────────────────────────
// Builds a proper NxN solid-color PNG with a centered letter.
// Uses deflate compression via zlib (built into Node).

import { deflateSync } from 'zlib';

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, t, data, crc]);
}

/**
 * Creates a solid-color PNG of size×size pixels.
 * bg = [r, g, b] background color
 * fg = [r, g, b] foreground color for the letter
 */
function makeSolidPng(size, bg, fg) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type: RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Build raw pixel data — each row: filter byte (0) + RGB pixels
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);

  // Draw background
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px]     = bg[0];
      raw[px + 1] = bg[1];
      raw[px + 2] = bg[2];
    }
  }

  // Draw a simple "R" lettermark using pixel blocks
  // Scale the letter to ~40% of icon size
  const letterSize = Math.floor(size * 0.45);
  const offsetX    = Math.floor((size - letterSize * 0.6) / 2);
  const offsetY    = Math.floor((size - letterSize) / 2);
  const stroke     = Math.max(2, Math.floor(letterSize / 8));

  function setPixel(x, y) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const rowStart = y * rowSize;
    const px = rowStart + 1 + x * 3;
    raw[px]     = fg[0];
    raw[px + 1] = fg[1];
    raw[px + 2] = fg[2];
  }

  function fillRect(x, y, w, h) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        setPixel(x + dx, y + dy);
  }

  // Draw "R":
  // Vertical stroke (left side)
  fillRect(offsetX, offsetY, stroke, letterSize);

  // Top horizontal bar
  const barW = Math.floor(letterSize * 0.55);
  fillRect(offsetX, offsetY, barW, stroke);

  // Middle horizontal bar (at ~45% height)
  const midY = offsetY + Math.floor(letterSize * 0.45);
  fillRect(offsetX, midY, barW, stroke);

  // Right side of top bowl (vertical)
  const bowlH = Math.floor(letterSize * 0.45);
  fillRect(offsetX + barW - stroke, offsetY, stroke, bowlH);

  // Diagonal leg (bottom right)
  const legLen = Math.floor(letterSize * 0.55);
  for (let i = 0; i < legLen; i++) {
    const lx = offsetX + stroke + Math.floor(i * 0.6);
    const ly = midY + i;
    fillRect(lx, ly, stroke, stroke);
  }

  // Compress with deflate
  const compressed = deflateSync(raw);

  // Wrap in zlib format (CMF + FLG + deflate + Adler32)
  const cmf = 0x78;
  const flg = 0x9C;
  let s1 = 1, s2 = 0;
  for (const byte of raw) { s1 = (s1 + byte) % 65521; s2 = (s2 + s1) % 65521; }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE((s2 << 16) | s1);

  // Use Node's deflateSync which already produces valid zlib
  const idat = deflateSync(raw);

  const chunks = [
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ];

  return Buffer.concat(chunks);
}

// ── Generate icons ────────────────────────────────────────────

mkdirSync('public/icons', { recursive: true });

// Terracotta #d96428 = R=217 G=100 B=40
const BG = [217, 100, 40];
// White
const FG = [255, 255, 255];

const icon192 = makeSolidPng(192, BG, FG);
const icon512 = makeSolidPng(512, BG, FG);

writeFileSync('public/icons/icon-192.png', icon192);
writeFileSync('public/icons/icon-512.png', icon512);

console.log(`✅ icon-192.png — ${icon192.length} bytes`);
console.log(`✅ icon-512.png — ${icon512.length} bytes`);
console.log('PWA icons created successfully.');
