#!/usr/bin/env node
/**
 * ทดสอบอัปโหลด Drive — ใช้ OAuth หรือ Service Account ตาม .env.local
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { google } from "googleapis";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("❌ ไม่พบ .env.local");
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

function getDriveAuth(env) {
  const { GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = env;
  if (GOOGLE_OAUTH_REFRESH_TOKEN && GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET) {
    const oauth2 = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
    return { auth: oauth2, mode: "OAuth (บัญชีครู)" };
  }

  const jwt = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
    ...(env.GOOGLE_DRIVE_IMPERSONATE_EMAIL
      ? { subject: env.GOOGLE_DRIVE_IMPERSONATE_EMAIL }
      : {}),
  });
  const mode = env.GOOGLE_DRIVE_IMPERSONATE_EMAIL
    ? `Impersonate ${env.GOOGLE_DRIVE_IMPERSONATE_EMAIL}`
    : "Service Account (ต้อง Shared Drive)";
  return { auth: jwt, mode };
}

const env = loadEnv();
const folderId = env.GOOGLE_DRIVE_FOLDER_ID;
const { auth, mode } = getDriveAuth(env);
const drive = google.drive({ version: "v3", auth });

async function main() {
  console.log("🔍 ทดสอบอัปโหลด Drive...\n");
  console.log(`   โหมด: ${mode}`);
  console.log(`   Folder: ${folderId}\n`);

  const folder = await drive.files.get({
    fileId: folderId,
    fields: "id,name",
    supportsAllDrives: true,
  });
  console.log(`✅ โฟลเดอร์: ${folder.data.name}`);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const testName = `_upload_test_${Date.now()}.png`;
  const created = await drive.files.create({
    requestBody: { name: testName, parents: [folderId] },
    media: { mimeType: "image/png", body: Readable.from(png) },
    fields: "id",
    supportsAllDrives: true,
  });

  await drive.files.delete({ fileId: created.data.id, supportsAllDrives: true });
  console.log("\n🎉 อัปโหลดสำเร็จ — พร้อมใช้งานจริง");
}

main().catch((err) => {
  console.error("\n❌", err.message || err);
  if (!env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    console.error("\n💡 ไม่มี Admin? รัน: npm run setup:oauth-drive");
  }
  process.exit(1);
});
