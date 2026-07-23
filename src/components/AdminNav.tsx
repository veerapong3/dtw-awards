import Link from "next/link";

export function AdminNav() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ระบบควบคุมผู้ดูแล</h1>
        <p className="text-sm text-slate-500">แก้ไข ลบ และตั้งค่าระบบข้อมูลโรงเรียน</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          จัดการกิจกรรม
        </Link>
        <Link
          href="/admin/reports"
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 text-sm"
        >
          รายงานสารสนเทศ
        </Link>
        <Link
          href="/admin/settings"
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm"
        >
          ตั้งค่าฟอร์ม
        </Link>
        <Link
          href="/admin/users"
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 text-sm"
        >
          ผู้ดูแลระบบ
        </Link>
        <Link
          href="/submit"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
        >
          เพิ่มผลงาน
        </Link>
      </div>
    </div>
  );
}
