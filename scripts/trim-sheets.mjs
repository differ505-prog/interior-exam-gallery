/**
 * scripts/trim-sheets.mjs
 *
 * 自動裁邊 Script：將紙張外的桌面背景裁掉，有效解析度再提升 1.15 倍。
 *
 * 使用方式：
 *   node scripts/trim-sheets.mjs
 *
 * 行為：
 *   1. 讀取 public/images/ 下的所有 .jpg 圖檔
 *   2. 使用 Sharp 自動裁邊（trim）偵測白色/淺色邊緣
 *   3. 輸出為 .trim.jpg，保留原檔
 *
 * 設計決策：
 *   - 輸出另存新檔（.trim.jpg），不覆寫原檔，保留 fallback
 *   - 若 trim 失敗（邊緣複雜），自動跳過該檔案
 */

import { readdir, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, "../public/images");

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".jpg") && !entry.name.includes(".trim")) {
      yield fullPath;
    }
  }
}

async function trimImage(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const basename = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${basename}.trim${ext}`);

  try {
    const image = sharp(inputPath);
    const meta = await image.metadata();

    // 偵測邊緣：讀取邊緣 20px，若平均亮度 > 240（幾乎白色）則裁
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const threshold = 240; // 白色 threshold
    const edgePx = 20;

    // 偵測上邊緣
    let topCrop = 0;
    outer: for (let y = 0; y < edgePx; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      topCrop++;
    }

    // 偵測下邊緣
    let bottomCrop = 0;
    outer: for (let y = height - 1; y >= height - edgePx; y--) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      bottomCrop++;
    }

    // 偵測左邊緣
    let leftCrop = 0;
    outer: for (let x = 0; x < edgePx; x++) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      leftCrop++;
    }

    // 偵測右邊緣
    let rightCrop = 0;
    outer: for (let x = width - 1; x >= width - edgePx; x--) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      rightCrop++;
    }

    const minCrop = 10; // 至少要裁 10px 才執行
    if (topCrop < minCrop && bottomCrop < minCrop && leftCrop < minCrop && rightCrop < minCrop) {
      console.log(`  ⏭  跳過（裁邊不足 ${minCrop}px）: ${path.basename(inputPath)}`);
      return;
    }

    const newWidth = width - leftCrop - rightCrop;
    const newHeight = height - topCrop - bottomCrop;

    await sharp(inputPath)
      .extract({
        left: leftCrop,
        top: topCrop,
        width: Math.max(newWidth, 100),
        height: Math.max(newHeight, 100),
      })
      .jpeg({ quality: 92 })
      .toFile(outputPath);

    const originalSize = (await sharp(inputPath).metadata()).width;
    const trimmedSize = (await sharp(outputPath).metadata()).width;
    const ratio = ((originalSize - trimmedSize) / originalSize * 100).toFixed(1);
    console.log(`  ✅ 裁邊 ${ratio}% → ${path.basename(outputPath)}`);
  } catch (err) {
    console.warn(`  ⚠️  裁邊失敗，跳過: ${path.basename(inputPath)} (${err.message})`);
  }
}

async function main() {
  console.log("🔍 開始自動裁邊...\n");

  if (!existsSync(IMAGES_DIR)) {
    console.error(`❌ 圖片目錄不存在: ${IMAGES_DIR}`);
    process.exit(1);
  }

  let count = 0;
  for await (const filePath of walkDir(IMAGES_DIR)) {
    await trimImage(filePath);
    count++;
  }

  console.log(`\n📊 完成，共處理 ${count} 個檔案`);
}

main().catch(console.error);
