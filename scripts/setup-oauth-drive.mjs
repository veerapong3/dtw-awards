#!/usr/bin/env node
/**
 * สร้างลิงก์ OAuth ผ่าน Vercel (ไม่ใช้ localhost — แก้ redirect_uri_mismatch)
 *
 * 1. เพิ่ม redirect URI ใน Google Cloud (Web application):
 *    https://dtw-awards.vercel.app/api/oauth/drive-callback
 * 2. Push env ขึ้น Vercel + deploy แล้วรันสคริปต์นี้
 * 3. เปิดลิงก์ → login academic@dontanwit.ac.th → คัดลอก refresh token จากหน้ success
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const REDIRECT_URI = "https://dtw-awards.vercel.app/api/oauth/drive-callback";
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let val = t.slice(i + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i)] = val;
  }
  return env;
}

const env = loadEnv();
const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("❌ ต้องมี GOOGLE_OAUTH_CLIENT_ID และ GOOGLE_OAUTH_CLIENT_SECRET ใน .env.local");
  process.exit(1);
}

const editUrl = `https://console.cloud.google.com/apis/credentials/oauthclient/${encodeURIComponent(clientId)}?project=mythic-lead-503208-b4`;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log(`
════════════════════════════════════════════════════════════
  OAuth Drive ผ่าน Vercel (ไม่ใช้ localhost)
════════════════════════════════════════════════════════════

1) Google Cloud → OAuth Client (Web application):
   ${editUrl}

2) Authorized redirect URIs → ADD URI (วางบรรทัดเดียวนี้):

   ${REDIRECT_URI}

3) SAVE แล้วรอ 1 นาที

4) เปิดลิงก์ด้านล่าง → login academic@dontanwit.ac.th → อนุญาต

5) คัดลอก GOOGLE_OAUTH_REFRESH_TOKEN จากหน้า "สำเร็จ"
   ใส่ใน .env.local แล้วรัน: node scripts/push-vercel-env.mjs

════════════════════════════════════════════════════════════

🔗 เปิดลิงก์นี้:

${authUrl}
`);
