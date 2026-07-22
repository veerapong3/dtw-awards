#!/usr/bin/env node
/**
 * ค้นหา Spreadsheet และโฟลเดอร์ Drive ที่ Service Account เข้าถึงได้
 * รัน: node scripts/discover-google.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("❌ ไม่พบ .env.local — รัน setup ก่อน");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i);
    let val = t.slice(i + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const PLACEHOLDERS = new Set([
  "SPREADSHEET_ID",
  "FOLDER_ID",
  "your-spreadsheet-id",
  "your-drive-folder-id",
  "ใส่-spreadsheet-id-ที่นี่",
  "ใส่-drive-folder-id-ที่นี่",
]);

function isPlaceholder(id) {
  return !id || PLACEHOLDERS.has(id) || id.includes("ใส่-");
}

const env = loadEnv();
const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!email || !key) {
  console.error("❌ ยังไม่มี GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY ใน .env.local");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email,
  key,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
});

const drive = google.drive({ version: "v3", auth });

async function listFiles(query) {
  const res = await drive.files.list({
    q: query,
    fields: "files(id,name,mimeType,modifiedTime)",
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    orderBy: "modifiedTime desc",
  });
  return res.data.files || [];
}

async function main() {
  console.log(`🔍 ค้นหาไฟล์ที่ Service Account เข้าถึงได้\n`);
  console.log(`   Email: ${email}\n`);

  const sheetId = env.GOOGLE_SHEET_ID;
  const folderId = env.GOOGLE_DRIVE_FOLDER_ID;

  if (isPlaceholder(sheetId)) {
    console.log("⚠️  GOOGLE_SHEET_ID ยังเป็นค่า placeholder — ต้องใส่ ID จริง\n");
  }
  if (isPlaceholder(folderId)) {
    console.log("⚠️  GOOGLE_DRIVE_FOLDER_ID ยังเป็นค่า placeholder — ต้องใส่ ID จริง\n");
  }

  let spreadsheets;
  let folders;

  try {
    spreadsheets = await listFiles(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    folders = await listFiles(
      "mimeType='application/vnd.google-apps.folder' and trashed=false"
    );
  } catch (err) {
    console.error("❌ เชื่อมต่อ Google ไม่ได้:", err.message || err);
    console.error("\nตรวจสอบว่า:");
    console.error("  1. เปิด Google Sheets API + Drive API ใน Google Cloud แล้ว");
    console.error("  2. แชร์ Spreadsheet และโฟลเดอร์ Drive ให้ email ด้านบน (สิทธิ์ Editor)");
    process.exit(1);
  }

  if (spreadsheets.length === 0 && folders.length === 0) {
    console.log("❌ ไม่พบไฟล์ที่แชร์ให้ Service Account\n");
    console.log("ทำตามนี้:");
    console.log("  1. เปิด Google Spreadsheet ของระบบเดิม → แชร์ → ใส่ email ด้านบน (Editor)");
    console.log('  2. เปิดโฟลเดอร์ Drive "DTW_Activity_Showcase" → แชร์ → ใส่ email ด้านบน (Editor)');
    console.log("  3. รันสคริปต์นี้อีกครั้ง\n");
    console.log("หา ID จาก URL:");
    console.log("  Spreadsheet: https://docs.google.com/spreadsheets/d/[ID]/edit");
    console.log("  โฟลเดอร์:    https://drive.google.com/drive/folders/[ID]");
    process.exit(1);
  }

  console.log("📊 Spreadsheets ที่เข้าถึงได้:\n");
  if (spreadsheets.length === 0) {
    console.log("   (ไม่มี — แชร์ Spreadsheet ให้ Service Account ก่อน)\n");
  } else {
    for (const f of spreadsheets) {
      const mark = f.id === sheetId ? " ← ใช้อยู่ใน .env.local" : "";
      console.log(`   ${f.name}`);
      console.log(`   ID: ${f.id}${mark}\n`);
    }
  }

  console.log("📁 โฟลเดอร์ Drive ที่เข้าถึงได้:\n");
  const showcase = folders.filter((f) =>
    /showcase|activity|dtw|ผลงาน/i.test(f.name)
  );
  const showList = showcase.length ? showcase : folders;

  if (folders.length === 0) {
    console.log('   (ไม่มี — แชร์โฟลเดอร์ "DTW_Activity_Showcase" ให้ Service Account ก่อน)\n');
  } else {
    for (const f of showList.slice(0, 15)) {
      const mark = f.id === folderId ? " ← ใช้อยู่ใน .env.local" : "";
      console.log(`   ${f.name}`);
      console.log(`   ID: ${f.id}${mark}\n`);
    }
    if (showList.length < folders.length && showcase.length) {
      console.log(`   (... และโฟลเดอร์อื่นอีก ${folders.length - showList.length} รายการ)\n`);
    }
  }

  const bestSheet = spreadsheets[0];
  const bestFolder =
    folders.find((f) => /DTW_Activity_Showcase/i.test(f.name)) ||
    folders.find((f) => /showcase|activity|dtw/i.test(f.name)) ||
    folders[0];

  if (bestSheet && bestFolder && (isPlaceholder(sheetId) || isPlaceholder(folderId))) {
    console.log("💡 คำสั่งอัปเดต .env.local (คัดลอก ID จากด้านบน หรือใช้ค่าที่แนะนำ):\n");
    console.log(
      `node scripts/setup-from-json.mjs "C:\\Users\\V.TAK\\Downloads\\mythic-lead-503208-b4-ff3f28ec8e22.json" --sheet-id=${bestSheet.id} --folder-id=${bestFolder.id}`
    );
    console.log("\nจากนั้นรัน: npm run test:google");
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
