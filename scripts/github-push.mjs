#!/usr/bin/env node
/**
 * สร้าง GitHub repo (ถ้ายังไม่มี) แล้ว push โค้ด
 * ต้อง login ก่อน: gh auth login
 */
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const gh = "C:\\Program Files\\GitHub CLI\\gh.exe";

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

try {
  execSync(`"${gh}" auth status`, { stdio: "pipe", cwd: root });
} catch {
  console.error(`
❌ ยังไม่ได้ login GitHub

รันก่อน:
  & "${gh}" auth login --hostname github.com --git-protocol https --web

แล้วรันสคริปต์นี้อีกครั้ง
`);
  process.exit(1);
}

const repoName = process.argv[2] || "dtw-awards";

console.log(`\n📦 สร้าง/เชื่อม repo: ${repoName}\n`);

try {
  run(`"${gh}" repo view ${repoName}`, { stdio: "pipe" });
  console.log("✅ repo มีอยู่แล้ว");
  try {
    run("git remote get-url origin", { stdio: "pipe" });
  } catch {
    const url = execSync(`"${gh}" repo view ${repoName} --json url -q .url`, {
      cwd: root,
      encoding: "utf8",
    }).trim();
    run(`git remote add origin ${url}.git`);
  }
} catch {
  run(
    `"${gh}" repo create ${repoName} --public --source=. --remote=origin --push`
  );
  console.log("\n🎉 push สำเร็จ");
  process.exit(0);
}

run("git push -u origin master");
console.log("\n🎉 push สำเร็จ");
