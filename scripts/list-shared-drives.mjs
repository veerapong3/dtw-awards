import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  let v = line.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i)] = v;
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

const drives = await drive.drives.list({ pageSize: 20 });
console.log("Shared Drives ที่ Service Account เข้าถึงได้:\n");
if (!drives.data.drives?.length) {
  console.log("  (ไม่มี — ต้องเพิ่ม SA เป็น member ของ Shared Drive)");
} else {
  for (const d of drives.data.drives) {
    console.log(`  ${d.name} → driveId: ${d.id}`);
  }
}
