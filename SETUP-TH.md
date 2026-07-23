# คู่มือตั้งค่า Google (ทีละขั้น)

ใช้เวลาประมาณ **15–20 นาที** ครั้งเดียว

---

## สิ่งที่ต้องมีก่อนเริ่ม

- บัญชี Google ของโรงเรียน (ที่เป็นเจ้าของ Spreadsheet เดิม)
- Spreadsheet ระบบผลงานเดิม (ชีต Records, Settings, Users, Students, Teachers)
- โฟลเดอร์ Drive ชื่อ `DTW_Activity_Showcase` (หรือจะสร้างใหม่ก็ได้)

---

## ขั้นที่ 1 — สร้าง Service Account ใน Google Cloud

1. เปิด [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจกต์ใหม่ (ชื่ออะไรก็ได้ เช่น `dtw-awards`)
3. ไปที่ **APIs & Services → Library** แล้วเปิดใช้งาน:
   - **Google Sheets API**
   - **Google Drive API**
4. ไปที่ **APIs & Services → Credentials**
5. กด **Create Credentials → Service account**
   - ชื่อ: `dtw-awards-bot` (หรืออะไรก็ได้)
   - Role: ข้ามได้ (ไม่บังคับ)
6. คลิก Service account ที่สร้าง → แท็บ **Keys**
7. **Add key → Create new key → JSON** → ดาวน์โหลดไฟล์ `.json`
8. **จด email** ในไฟล์ JSON ฟิลด์ `client_email`  
   ตัวอย่าง: `dtw-awards-bot@my-project.iam.gserviceaccount.com`

> เก็บไฟล์ JSON ไว้ปลอดภัย — อย่า commit ขึ้น GitHub

---

## ขั้นที่ 2 — แชร์ Spreadsheet ให้ Service Account

1. เปิด Google Spreadsheet ของระบบเดิม
2. กด **แชร์ (Share)**
3. วาง email ของ Service Account (`client_email` จากขั้นที่ 1)
4. สิทธิ์: **Editor (แก้ไขได้)**
5. ยกเลิกติ๊ก “แจ้งเตือน” แล้วกดแชร์

### หา Spreadsheet ID

จาก URL ของชีต:
```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                      คัดลอกส่วนนี้ = GOOGLE_SHEET_ID
```

---

## ขั้นที่ 3 — โฟลเดอร์ Drive สำหรับรูปภาพ

> **สำคัญ:** Service Account **อัปโหลดรูปใน My Drive ไม่ได้** (ไม่มี storage quota)

### วิธี C — OAuth บัญชีครู (ไม่ต้อง Admin) ⭐ แนะนำถ้าไม่มี Shared Drive

ใช้บัญชีครูที่เป็นเจ้าของโฟลเดอร์ (เช่น `academic@dontanwit.ac.th`) authorize ครั้งเดียว:

**1. สร้าง OAuth Client ใน Google Cloud**

- APIs & Services → **OAuth consent screen** → External หรือ Internal → ใส่ email ครูเป็น Test user
- Credentials → **Create OAuth client ID** → Web application
- Authorized redirect URI: `http://localhost:3333/oauth/callback`

**2. รันสคริปต์ authorize (ครั้งเดียว)**

```powershell
npm run setup:oauth-drive -- CLIENT_ID CLIENT_SECRET
```

Login ด้วยบัญชี `academic@dontanwit.ac.th` → อนุญาต → ได้ refresh token ใน `.env.local`

**3. Push ขึ้น Vercel**

```powershell
node scripts/push-vercel-env.mjs
```

**4. ทดสอบ**

```powershell
npm run test:drive-upload
```

---

### วิธี A — Shared Drive (ต้องมีเมนู Shared drives + Admin)

1. เปิด Google Drive → เมนูซ้าย **Shared drives** (ไดรฟ์ที่ใช้ร่วมกัน)
2. สร้าง Shared Drive ใหม่ (ชื่ออะไรก็ได้ เช่น `DTW School Drive`)
3. ใน Shared Drive สร้างโฟลเดอร์ `DTW_Activity_Showcase`
4. คลิก Shared Drive → **Manage members** → เพิ่ม email Service Account  
   สิทธิ์: **Content manager** (ผู้จัดการเนื้อหา) ขึ้นไป
5. คัดลอก Folder ID ของ `DTW_Activity_Showcase` ใส่ `GOOGLE_DRIVE_FOLDER_ID`

> ถ้าโฟลเดอร์เดิมอยู่ใน My Drive ให้ **ย้าย** เข้า Shared Drive (ลากวาง) แล้วใช้ ID ใหม่

### วิธี B — Impersonate ผู้ใช้ (Google Workspace + Admin)

ใช้เมื่อไม่ใช้ Shared Drive แต่มี Google Workspace Admin:

1. Google Cloud → Service Account → เปิด **Domain-wide delegation**
2. Google Admin Console → Security → API Controls → Domain-wide delegation  
   เพิ่ม Client ID ของ Service Account + scope: `https://www.googleapis.com/auth/drive`
3. ใส่ใน `.env.local` และ Vercel:
   ```
   GOOGLE_DRIVE_IMPERSONATE_EMAIL=ครู@โรงเรียน.ac.th
   ```
   (email จริงที่มีพื้นที่ Drive และเป็นเจ้าของ/แชร์โฟลเดอร์ให้แล้ว)

### วิธีเดิม — My Drive อย่างเดียว (ใช้ไม่ได้กับอัปโหลดรูป)

แชร์โฟลเดอร์ใน My Drive ให้ Service Account อ่าน/เขียน Sheet ได้ แต่ **อัปโหลดรูปจะ error** — ต้องใช้วิธี A หรือ B

1. เปิด Google Drive → หาโฟลเดอร์ `DTW_Activity_Showcase`
2. คลิกขวา → **แชร์** → email Service Account (Editor)

### หา Folder ID

เปิดโฟลเดอร์ในเบราว์เซอร์ ดู URL:
```
https://drive.google.com/drive/folders/1XyZ_AbCdEfGhIjKlMnOpQr
                                        ^^^^^^^^^^^^^^^^^^^^^^^
                                        คัดลอกส่วนนี้ = GOOGLE_DRIVE_FOLDER_ID
```

---

## ขั้นที่ 4 — ใส่ค่าในโปรเจกต์ (อัตโนมัติ)

เปิด Terminal ในโฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
cd C:\Users\V.TAK\OneDrive\Desktop\Awads

# แทนที่ path ด้วยที่เก็บไฟล์ JSON จริง
node scripts/setup-from-json.mjs "C:\Users\V.TAK\Downloads\my-project-xxxxx.json" --sheet-id=SPREADSHEET_ID --folder-id=FOLDER_ID
```

สคริปต์จะสร้าง/อัปเดต `.env.local` ให้อัตโนมัติ

---

## ขั้นที่ 5 — ทดสอบการเชื่อมต่อ

```powershell
npm run test:google
```

ถ้าสำเร็จจะเห็น:
```
✅ Spreadsheet: ชื่อชีต
✅ ชีตครบ: Records, Settings, ...
✅ โฟลเดอร์ Drive: DTW_Activity_Showcase
🎉 เชื่อมต่อสำเร็จ
```

### ถ้า error 403
→ ยังไม่ได้แชร์ Spreadsheet หรือโฟลเดอร์ Drive ให้ Service Account

### ถ้า error 404
→ ตรวจ `GOOGLE_SHEET_ID` / `GOOGLE_DRIVE_FOLDER_ID` ว่าคัดลอกถูก

---

## ขั้นที่ 6 — รันเว็บ

```powershell
npm run dev
```

เปิด http://localhost:3000  
- หน้าแรกควรโหลดข้อมูลจาก Sheets จริง (ไม่มีแบนเนอร์ Mock)
- Login admin: ใช้ user ในชีต `Users` (เดิม `admin` / `dtw12345`)

---

## ขั้นที่ 7 — Deploy ขึ้น Vercel

1. Push โปรเจกต์ขึ้น GitHub
2. Import ใน [vercel.com](https://vercel.com)
3. ไป **Settings → Environment Variables** ใส่ทุกค่าจาก `.env.local`:
   - `USE_MOCK` = `false`
   - `SESSION_SECRET`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (วางทั้งก้อน รวม `\n`)
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_DRIVE_FOLDER_ID`
4. Redeploy → ได้โดเมน `*.vercel.app`

---

## Checklist สรุป

- [ ] เปิด Google Sheets API + Drive API
- [ ] ดาวน์โหลด Service Account JSON
- [ ] แชร์ Spreadsheet ให้ `client_email`
- [ ] แชร์โฟลเดอร์ Drive ให้ `client_email`
- [ ] รัน `setup-from-json.mjs`
- [ ] รัน `npm run test:google` ผ่าน
- [ ] รัน `npm run dev` ทดสอบ
- [ ] Deploy Vercel + ใส่ env
