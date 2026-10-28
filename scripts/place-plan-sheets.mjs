/**
 * scripts/place-plan-sheets.mjs
 *
 * 把下載資料夾的平面圖圖檔（題目卷 / 需求單版本）放到 public/images/plan/ 的正確位置。
 *
 * 用法：
 *   node scripts/place-plan-sheets.mjs [來源資料夾]
 *
 * 行為：
 *   1. 來源檔名格式：
 *      - 平面圖-<題號>.jpg      → public/images/plan/question-<題號>.jpg
 *      - 平面圖-需求<版本>.jpg  → public/images/plan/requirement-<版本>.jpg
 *   2. 壓縮策略：長邊上限 2400px（與既有 question-205 / requirement-* 一致）、JPEG q88。
 *   3. 既有檔案以 --force 覆寫，避免重複檔名殘留。
 *
 * 設計說明：
 *   - 平面圖需求單以 A~F 版本共用（見 src/lib/requirement-resolver.ts），
 *     故需求單檔名為 requirement-<版本>.jpg，與題號無關。
 *   - 既有 .trim.jpg 為早期自動裁邊產物，現行程式碼未引用，故不另產。
 */

import { mkdir, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/images/plan");
const SOURCE_DIR = process.argv[2] ?? path.join(process.env.HOME, "Downloads/平面圖");

const MAX_EDGE = 2400;
const QUALITY = 88;

function resolveTarget(fileName) {
  const base = path.basename(fileName, path.extname(fileName));

  // 平面圖-<題號> → question-<題號>.jpg
  const questionMatch = base.match(/^平面圖-(\d{3})$/);
  if (questionMatch) {
    return { fileName: `question-${questionMatch[1]}.jpg`, label: "題目卷" };
  }

  // 平面圖-需求<版本> → requirement-<版本>.jpg
  const requirementMatch = base.match(/^平面圖-需求([A-Z])$/);
  if (requirementMatch) {
    return { fileName: `requirement-${requirementMatch[1]}.jpg`, label: `需求單 ${requirementMatch[1]}` };
  }

  return null;
}

async function processFile(fileName) {
  const target = resolveTarget(fileName);
  if (!target) {
    console.log(`  ⏭  跳過（命名不符）: ${fileName}`);
    return null;
  }

  const src = path.join(SOURCE_DIR, fileName);
  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, target.fileName);

  const meta = await sharp(src).metadata();
  const resized = await sharp(src)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY })
    .toFile(outPath);

  console.log(
    `  ✅ ${fileName} → ${path.relative(ROOT, outPath)} ` +
      `(${target.label}，${meta.width}×${meta.height} → ${resized.width}×${resized.height})`,
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
