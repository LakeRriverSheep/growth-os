// 生成 PWA 图标：深色底 + 绿色字母 I（纯色像素级绘制，零依赖）
// 运行：node scripts/gen-icons.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

// CRC32（PNG 块校验用）
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 设计：zinc-950 圆角底 + emerald 字母 I（竖条+上下横杠，居中在安全区内）
function drawIcon(x, y, s) {
  const u = s / 512;
  const corner = 96 * u;
  // 圆角外透明
  const inRounded =
    (x >= corner && x < s - corner) ||
    (y >= corner && y < s - corner) ||
    Math.hypot(x - corner, y - corner) < corner ||
    Math.hypot(x - (s - corner), y - corner) < corner ||
    Math.hypot(x - corner, y - (s - corner)) < corner ||
    Math.hypot(x - (s - corner), y - (s - corner)) < corner;
  if (!inRounded) return [0, 0, 0, 0];
  // 字母 I：竖条宽 72，上下横杠 224×64，居中
  const cx = s / 2, barW = 72 * u, armW = 224 * u, armH = 64 * u;
  const top = 128 * u, bottom = s - 128 * u;
  const inStem = Math.abs(x - cx) < barW / 2 && y > top && y < bottom;
  const inTopArm = Math.abs(x - cx) < armW / 2 && y > top && y < top + armH;
  const inBotArm = Math.abs(x - cx) < armW / 2 && y > bottom - armH && y < bottom;
  if (inStem || inTopArm || inBotArm) return [16, 185, 129, 255]; // emerald-500
  return [9, 9, 11, 255]; // zinc-950
}

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), makePng(size, drawIcon));
  console.log(`✓ icon-${size}.png`);
}
// favicon 用 32 尺寸
fs.writeFileSync(path.join(process.cwd(), "src", "app", "icon.png"), makePng(32, drawIcon));
console.log("✓ src/app/icon.png (favicon)");
