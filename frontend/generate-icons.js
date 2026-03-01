// Generate simple PNG icons using pure Node.js (no native modules)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.37;
  const innerR = size * 0.32;
  const dotR = size * 0.08;
  const cornerR = size * 0.18;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const inCorner = (
        (x < cornerR && y < cornerR && Math.sqrt((x - cornerR) ** 2 + (y - cornerR) ** 2) > cornerR) ||
        (x > size - cornerR && y < cornerR && Math.sqrt((x - (size - cornerR)) ** 2 + (y - cornerR) ** 2) > cornerR) ||
        (x < cornerR && y > size - cornerR && Math.sqrt((x - cornerR) ** 2 + (y - (size - cornerR)) ** 2) > cornerR) ||
        (x > size - cornerR && y > size - cornerR && Math.sqrt((x - (size - cornerR)) ** 2 + (y - (size - cornerR)) ** 2) > cornerR)
      );

      if (inCorner) {
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0;
        continue;
      }

      if (dist <= outerR && dist > innerR) {
        pixels[idx] = 96; pixels[idx+1] = 165; pixels[idx+2] = 250; pixels[idx+3] = 255;
      } else if (dist <= innerR) {
        const ps = size * 0.18;
        const pinTop = cy - ps;
        const pinBot = cy + ps * 0.5;
        let isPin = false;
        if (y >= pinTop && y <= pinBot) {
          const progress = (y - pinTop) / (pinBot - pinTop);
          const halfWidth = ps * 0.7 * progress;
          if (x >= cx - halfWidth && x <= cx + halfWidth) { isPin = true; }
        }
        if (isPin || dist <= dotR) {
          pixels[idx] = 255; pixels[idx+1] = 255; pixels[idx+2] = 255; pixels[idx+3] = 255;
        } else {
          const t = dist / innerR;
          pixels[idx] = Math.round(59 + 37*(1-t));
          pixels[idx+1] = Math.round(130 + 35*(1-t));
          pixels[idx+2] = Math.round(246 + 4*(1-t));
          pixels[idx+3] = 255;
        }
      } else {
        pixels[idx] = 15; pixels[idx+1] = 23; pixels[idx+2] = 42; pixels[idx+3] = 255;
      }
    }
  }
  return encodePNG(size, size, pixels);
}

function encodePNG(w, h, pixels) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const c = crc32(Buffer.concat([t, data]));
  const cb = Buffer.alloc(4); cb.writeUInt32BE(c);
  return Buffer.concat([len, t, data, cb]);
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

[72, 96, 128, 144, 152, 192, 384, 512].forEach(s => {
  const png = createPNG(s);
  fs.writeFileSync(path.join(outDir, `icon-${s}x${s}.png`), png);
  console.log(`icon-${s}x${s}.png (${png.length} bytes)`);
});
console.log('Done!');
