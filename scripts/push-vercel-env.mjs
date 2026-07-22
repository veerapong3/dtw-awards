#!/usr/bin/env node
/**
 * Push .env.local vars to Vercel (production, preview, development)
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { randomBytes } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

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
  if (key === "VERCEL_OIDC_TOKEN") continue;
  let val = t.slice(i + 1);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

// Use a strong session secret for production
env.SESSION_SECRET = randomBytes(32).toString("hex");

const keys = [
  "USE_MOCK",
  "SESSION_SECRET",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
  "GOOGLE_DRIVE_FOLDER_ID",
];

const environments = ["production", "preview", "development"];

console.log("📤 กำลังอัปโหลด env ไป Vercel...\n");

for (const key of keys) {
  const value = env[key];
  if (!value) {
    console.warn(`⚠️  ข้าม ${key} (ไม่มีค่า)`);
    continue;
  }
  for (const target of environments) {
    const sensitive = target !== "development" ? " --sensitive" : "";
    try {
      execSync(`npx vercel env add ${key} ${target} --force${sensitive}`, {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        cwd: resolve(__dirname, ".."),
      });
    } catch {
      console.error(`❌ ${key} (${target}) — ล้มเหลว`);
      process.exit(1);
    }
  }
  console.log(`✅ ${key}`);
}

console.log("\n🎉 ตั้งค่า env บน Vercel ครบแล้ว");
