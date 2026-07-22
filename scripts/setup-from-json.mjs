#!/usr/bin/env node
/**
 * อ่านไฟล์ Service Account JSON จาก Google Cloud แล้วสร้าง/อัปเดต .env.local
 *
 * วิธีใช้:
 *   node scripts/setup-from-json.mjs path/to/service-account.json
 *   node scripts/setup-from-json.mjs path/to/service-account.json --sheet-id=xxx --folder-id=yyy
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error(`
❌ ระบุ path ไฟล์ JSON ของ Service Account

ตัวอย่าง:
  node scripts/setup-from-json.mjs C:\\Users\\You\\Downloads\\my-project-xxxxx.json
  node scripts/setup-from-json.mjs ./credentials.json --sheet-id=1abc... --folder-id=1xyz...
`);
  process.exit(1);
}

const absJson = resolve(jsonPath);
if (!existsSync(absJson)) {
  console.error(`❌ ไม่พบไฟล์: ${absJson}`);
  process.exit(1);
}

let creds;
try {
  creds = JSON.parse(readFileSync(absJson, "utf8"));
} catch {
  console.error("❌ อ่านไฟล์ JSON ไม่ได้");
  process.exit(1);
}

if (!creds.client_email || !creds.private_key) {
  console.error("❌ ไฟล์นี้ไม่ใช่ Service Account JSON ที่ถูกต้อง");
  process.exit(1);
}

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : "";
}

const sheetId = arg("sheet-id");
const folderId = arg("folder-id");

let existing = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) existing[m[1]] = m[2];
  }
}

const privateKey = creds.private_key.replace(/\n/g, "\\n");
const sessionSecret =
  existing.SESSION_SECRET?.replace(/^"|"$/g, "") ||
  randomBytes(32).toString("hex");

const lines = [
  "USE_MOCK=false",
  `SESSION_SECRET=${sessionSecret}`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL=${creds.client_email}`,
  `GOOGLE_PRIVATE_KEY="${privateKey}"`,
  `GOOGLE_SHEET_ID=${sheetId || existing.GOOGLE_SHEET_ID?.replace(/^"|"$/g, "") || "ใส่-spreadsheet-id-ที่นี่"}`,
  `GOOGLE_DRIVE_FOLDER_ID=${folderId || existing.GOOGLE_DRIVE_FOLDER_ID?.replace(/^"|"$/g, "") || "ใส่-drive-folder-id-ที่นี่"}`,
  "",
];

writeFileSync(envPath, lines.join("\n"), "utf8");

console.log(`
✅ บันทึก .env.local เรียบร้อย

Service Account email (ต้องแชร์ให้ชีต + โฟลเดอร์ Drive):
  ${creds.client_email}

ขั้นตอนถัดไป:
  1. แชร์ Google Spreadsheet ให้ email ด้านบน (สิทธิ์ Editor)
  2. แชร์โฟลเดอร์ Drive "DTW_Activity_Showcase" ให้ email ด้านบน (Editor)
  3. ใส่ GOOGLE_SHEET_ID และ GOOGLE_DRIVE_FOLDER_ID ใน .env.local (ถ้ายังไม่ได้ใส่)
  4. รันทดสอบ: npm run test:google
`);
