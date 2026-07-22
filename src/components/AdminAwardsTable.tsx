"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AwardRecord } from "@/lib/types";

export function AdminAwardsTable({ records }: { records: AwardRecord[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("ยืนยันลบรายการนี้? การลบไม่สามารถกู้คืนได้")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/awards/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "ลบไม่สำเร็จ");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
      <h2 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">
        ตารางจัดการข้อมูลกิจกรรม
      </h2>
      <table className="w-full text-sm text-left text-slate-600">
        <thead className="text-xs text-slate-500 uppercase bg-slate-100">
          <tr>
            <th className="py-3 px-4">ปีการศึกษา</th>
            <th className="py-3 px-4">กิจกรรม/การแข่งขัน</th>
            <th className="py-3 px-4">กลุ่มสาระ</th>
            <th className="py-3 px-4">ระดับ</th>
            <th className="py-3 px-4 text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-slate-400">
                ไม่มีกิจกรรมในระบบ
              </td>
            </tr>
          ) : (
            records.map((rec) => (
              <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-semibold">
                  {rec.academicYear}/{rec.term}
                </td>
                <td className="py-3 px-4 font-medium text-slate-800">{rec.activityName}</td>
                <td className="py-3 px-4">{rec.learningArea}</td>
                <td className="py-3 px-4">{rec.level}</td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex gap-2">
                    <Link
                      href={`/admin/awards/${rec.id}`}
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded text-xs font-bold"
                    >
                      แก้ไข
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === rec.id}
                      onClick={() => onDelete(rec.id)}
                      className="px-2.5 py-1.5 bg-red-50 text-red-700 rounded text-xs font-bold disabled:opacity-50"
                    >
                      {busyId === rec.id ? "..." : "ลบ"}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
