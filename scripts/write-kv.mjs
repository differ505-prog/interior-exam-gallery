/**
 * 直接寫入 Supabase user_data 表（代替 KV）
 */
import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "fs";

const SUPABASE_URL = "https://dpfjudyfsjyrenylbwyq.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwZmp1ZHlmc2p5cmVueWxid3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NzEwMTIsImV4cCI6MjEwMjQ0NzAxMn0.1Q_8oFh5CP_0Vxzk4lkpEKiZq1QN3JNHeBhHSQCB0_0";
const DESKTOP = "/Users/liangzhiwei/Desktop/202A-F完稿";
const TITLE_PREFIX = "202A-F 完稿";
const CLOUDINARY_BASE = "https://res.cloudinary.com/mk4j5qx0/image/upload/v1787300907/draft-gallery/202A";

const variants = ["A", "B", "C", "D", "E", "F"];

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Upload image to Supabase storage bucket
async function uploadToSupabaseStorage(sheetCode, fileName, filePath) {
  const fileBuffer = await streamToBuffer(createReadStream(filePath));
  const blob = new Blob([fileBuffer]);

  // Upload via storage API
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/practice-images/${sheetCode}/${fileName}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: blob,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json;
}

// Write metadata to user_data table via service role
async function writeToSupabase(entry) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB insert failed: ${res.status} ${text}`);
  }
  return await res.json();
}

console.log("=== 批次上傳 202A-F 至 Supabase ===\n");

let ok = 0;
for (const letter of variants) {
  const fileName = `202${letter}.jpg`;
  const filePath = `${DESKTOP}/${fileName}`;
  const cloudinaryUrl = `${CLOUDINARY_BASE}/202${letter}-%E5%AE%8C%E7%A8%BF.jpg`;

  process.stdout.write(`上傳 ${fileName} → ${cloudinaryUrl} ... `);

  try {
    await writeToSupabase({
      sheet_code: `202${letter}`,
      category: "平面圖 201-206",
      title: `${TITLE_PREFIX} ${letter}`,
      image_url: cloudinaryUrl,
      kind: "他人作品參考",
      author_name: "differ505",
      score_note: null,
      teacher_comment: null,
      weaknesses: [],
    });
    console.log("✓ 完成");
    ok++;
  } catch (err) {
    console.log(`✗ 失敗: ${err.message}`);
  }
}

console.log(`\n完成 ${ok}/${variants.length} 筆`);
