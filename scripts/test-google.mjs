#!/usr/bin/env node
/**
 * ทดสอบการเชื่อมต่อ Google Sheets + Drive
 * รัน: npm run test:google
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

const env = loadEnv();

if (env.USE_MOCK === "true") {
  console.log("⚠️  USE_MOCK=true — ปิด mock ก่อน (ตั้ง USE_MOCK=false ใน .env.local)");
  process.exit(1);
}

const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const sheetId = env.GOOGLE_SHEET_ID;
const folderId = env.GOOGLE_DRIVE_FOLDER_ID;

if (!email || !key) {
  console.error("❌ ยังไม่มี GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY");
  process.exit(1);
}
const PLACEHOLDERS = new Set([
  "SPREADSHEET_ID",
  "FOLDER_ID",
  "your-spreadsheet-id",
  "your-drive-folder-id",
]);

function isPlaceholder(id) {
  return !id || PLACEHOLDERS.has(id) || id.includes("ใส่-");
}

if (isPlaceholder(sheetId)) {
  console.error("❌ GOOGLE_SHEET_ID ยังเป็นค่า placeholder (SPREADSHEET_ID)");
  console.error("   → เปิด Spreadsheet → คัดลอก ID จาก URL");
  console.error("   → รัน: node scripts/discover-google.mjs เพื่อดูรายการที่แชร์แล้ว");
  process.exit(1);
}
if (isPlaceholder(folderId)) {
  console.error("❌ GOOGLE_DRIVE_FOLDER_ID ยังเป็นค่า placeholder (FOLDER_ID)");
  console.error("   → เปิดโฟลเดอร์ Drive → คัดลอก ID จาก URL");
  console.error("   → รัน: node scripts/discover-google.mjs เพื่อดูรายการที่แชร์แล้ว");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email,
  key,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const requiredSheets = ["Records", "Settings", "Users", "Students", "Teachers"];

async function main() {
  console.log("🔍 กำลังทดสอบการเชื่อมต่อ Google...\n");

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "properties.title,sheets.properties.title",
  });
  console.log(`✅ Spreadsheet: ${meta.data.properties?.title}`);

  const titles = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
  const missing = requiredSheets.filter((n) => !titles.includes(n));
  if (missing.length) {
    console.log(`⚠️  ชีตที่ยังไม่มี: ${missing.join(", ")}`);
    console.log("   → รัน Apps Script initializeDatabase() ครั้งหนึ่ง หรือสร้างชีตเองตาม README");
  } else {
    console.log(`✅ ชีตครบ: ${requiredSheets.join(", ")}`);
  }

  const records = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Records!A1:O5",
  });
  const rows = records.data.values?.length || 0;
  console.log(`✅ อ่าน Records ได้ (${rows} แถวแรกๆ รวมหัวตาราง)`);

  const folder = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });
  if (folder.data.mimeType !== "application/vnd.google-apps.folder") {
    console.error("❌ GOOGLE_DRIVE_FOLDER_ID ไม่ใช่โฟลเดอร์");
    process.exit(1);
  }
  console.log(`✅ โฟลเดอร์ Drive: ${folder.data.name}`);

  console.log("\n🎉 เชื่อมต่อสำเร็จ — รัน npm run dev แล้วลองใช้งานได้เลย");
}

main().catch((err) => {
  console.error("\n❌ เชื่อมต่อไม่สำเร็จ:\n");
  const msg = err.message || String(err);
  if (msg.includes("has not been used") || msg.includes("is disabled")) {
    if (msg.includes("sheets.googleapis.com")) {
      console.error("   → ยังไม่ได้เปิด Google Sheets API ใน Google Cloud");
      console.error("   → เปิดที่: https://console.cloud.google.com/apis/library/sheets.googleapis.com");
    }
    if (msg.includes("drive.googleapis.com")) {
      console.error("   → ยังไม่ได้เปิด Google Drive API ใน Google Cloud");
      console.error("   → เปิดที่: https://console.cloud.google.com/apis/library/drive.googleapis.com");
    }
    console.error("\n   หลังเปิด API แล้ว รอ 1–2 นาที แล้วรัน npm run test:google อีกครั้ง");
  } else if (err.code === 403 || msg.includes("403")) {
    console.error("   → แชร์ Spreadsheet และโฟลเดอร์ Drive ให้ Service Account แล้วหรือยัง?");
    console.error(`   → Email ที่ต้องแชร์: ${email}`);
  } else if (err.code === 404) {
    console.error("   → ตรวจ GOOGLE_SHEET_ID หรือ GOOGLE_DRIVE_FOLDER_ID ว่าถูกต้อง");
  } else {
    console.error(msg);
  }
  process.exit(1);
});
