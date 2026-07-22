# ระบบผลงานครูและนักเรียน — โรงเรียนดอนตาลวิทยา

Next.js บน **Vercel** + **Google Sheets** (ฐานข้อมูล) + **Google Drive** (รูปภาพ)

## สิ่งที่ได้ในเวอร์ชันนี้

| หน้า | สิทธิ์ |
|------|--------|
| `/` โชว์ผลงาน | สาธารณะ |
| `/stats` สถิติ | สาธารณะ |
| `/submit` เพิ่มผลงาน | สาธารณะ (แสดงทันทีหลังบันทึก) |
| `/admin` แก้ไข/ลบ | Admin login |
| `/admin/reports` ส่งออกรายงาน CSV/Excel | Admin login |
| `/admin/settings` ตั้งค่า | Admin login |

โค้ดเดิม Apps Script อยู่ที่ `legacy/`

## เริ่มต้นแบบทดสอบ (ไม่ต้องมี Google)

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

- โหมด Mock เปิดอยู่ (`USE_MOCK=true` ใน `.env.local`)
- Admin ทดสอบ: `admin` / `dtw12345`

## เชื่อม Google Sheets + Drive จริง

**คู่มือละเอียดทีละขั้น:** ดู [`SETUP-TH.md`](./SETUP-TH.md)

### สรุปสั้นๆ

1. สร้าง Service Account + เปิด Sheets/Drive API ใน Google Cloud
2. แชร์ Spreadsheet + โฟลเดอร์ `DTW_Activity_Showcase` ให้ email ของ Service Account
3. รันสคริปต์ตั้งค่าอัตโนมัติ:

```bash
node scripts/setup-from-json.mjs "path/to/service-account.json" --sheet-id=YOUR_SHEET_ID --folder-id=YOUR_FOLDER_ID
npm run test:google
npm run dev
```

## Deploy ขึ้น Vercel

1. Push โปรเจกต์ขึ้น GitHub
2. Import ใน Vercel
3. ใส่ Environment Variables
4. Deploy → ได้โดเมน `*.vercel.app`

## โครงสร้างชีต (เหมือนระบบเดิม)

**Records:** ID, Timestamp, AcademicYear, Term, LearningArea, ActivityName, Level, StartDate, EndDate, Location, Province, StudentsJSON, TeachersJSON, ImageUrls, CertificateUrl

**Settings:** SettingType, Value

**Users:** Username, Password, FullName

**Students / Teachers:** ตามระบบเดิม

## หมายเหตุ

- การเพิ่มผลงานสาธารณะมี rate limit เบื้องต้น (กันส่งรัว)
- Session Admin เก็บใน httpOnly cookie (ไม่ใช้ localStorage แบบเดิม)
- ถ้ายังไม่เชื่อม Google ระบบจะรันโหมด Mock อัตโนมัติเมื่อไม่ครบ env
