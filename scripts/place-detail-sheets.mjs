/**
 * scripts/place-detail-sheets.mjs
 *
 * 把下載資料夾的大樣圖（題目卷 / 官方答案）放到 public/images/<code>/ 的正確位置。
 *
 * 用法：
 *   node scripts/place-detail-sheets.mjs
 *
 * 行為：
 *   1. 來源檔名格式：<標題>-<code>-<題目卷|官方答案>.jpg
 *   2. 輸出：public/images/<code>/<code>-question.jpg（題目卷）
 *            public/images/<code>/<code>-answer.jpg（官方答案）
 *   3. 壓縮策略：長邊上限 2400px（與既有 224 大樣圖一致）、JPEG q88。
 *      大樣圖掃描稿本身無白邊可裁，故不另產 .trim.jpg（與 224 一致）。
 */

import { mkdir, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "public/images");
const SOURCE_DIR = process.argv[2] ?? path.join(process.env.HOME, "Downloads/大樣圖");

const MAX_EDGE = 2400;
const QUALITY = 88;

const SLOT_BY_LABEL = {
  題目卷: "question",
  官方答案: "answer",
};

async function processFile(fileName) {
  const base = path.basename(fileName, ".jpg");
  const parts = base.split("-");
  const code = parts[parts.length - 2];
  const label = parts[parts.length - 1];
  const slot = SLOT_BY_LABEL[label];
  if (!slot || !/^\d{3}$/.test(code)) {
    console.log(`  ⏭  跳過（命名不符）: ${fileName}`);
    return null;
  }

  const src = path.join(SOURCE_DIR, fileName);
  const outDir = path.join(IMAGES_DIR, code);
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${code}-${slot}.jpg`);

  const image = sharp(src);
  const meta = await image.metadata();
  const resized = await sharp(src)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY })
    .toFile(outPath);

  console.log(
    `  ✅ ${fileName} → ${path.relative(ROOT, outPath)} ` +
      `(${meta.width}×${meta.height} → ${resized.width}×${resized.height})`,
  );
  return outPath;
}

async function main() {
  const entries = await readdir(SOURCE_DIR);
  const files = entries.filter((f) => f.toLowerCase().endsWith(".jpg") && !f.startsWith("."));
  console.log(`🔍 來源資料夾：${SOURCE_DIR}\n`);

  for (const file of files) {
    await processFile(file);
  }
  console.log("\n📊 完成");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
