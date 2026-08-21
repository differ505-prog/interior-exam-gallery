/**
 * 批次上傳 202A-F 完稿至 Cloudinary
 * 用法: node --env-file=.env.local scripts/upload-202x.mjs
 */
import { v2 as cloudinary } from "cloudinary";
import { createReadStream } from "fs";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "draft-gallery";
const SHEET_CODE = "202A";
const DESKTOP = "/Users/liangzhiwei/Desktop/202A-F完稿";
const TITLE_PREFIX = "202A-F 完稿";

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const variants = [
  { letter: "A" },
  { letter: "B" },
  { letter: "C" },
  { letter: "D" },
  { letter: "E" },
  { letter: "F" },
];

console.log("開始上傳 202A-F 完稿至 Cloudinary...\n");

const results = [];
for (const { letter } of variants) {
  const fileName = `202${letter}.jpg`;
  const filePath = `${DESKTOP}/${fileName}`;
  const publicId = `202${letter}-完稿`;

  try {
    console.log(`上傳 ${fileName} ...`);
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `${FOLDER}/${SHEET_CODE}`,
      public_id: publicId,
      resource_type: "image",
    });
    console.log(`  ✓ ${result.secure_url}`);
    results.push({ letter, url: result.secure_url });
  } catch (err) {
    console.error(`  ✗ ${fileName} 失敗: ${err.message}`);
  }
}

console.log("\n上傳結果：");
for (const r of results) {
  console.log(`  202${r.letter}: ${r.url}`);
}
