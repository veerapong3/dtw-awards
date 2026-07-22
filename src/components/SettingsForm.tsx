"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SystemSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: SystemSettings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({
    AcademicYear: settings.AcademicYear.join(", "),
    Term: settings.Term.join(", "),
    HighStatsLevels: settings.HighStatsLevels.join(", "),
    LearningArea: settings.LearningArea.join(", "),
    Level: settings.Level.join(", "),
    AwardLevel: settings.AwardLevel.join(", "),
    AwardType: settings.AwardType.join(", "),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const createRows = (text: string, type: keyof SystemSettings) =>
        text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((value) => ({ type, value }));

      const items = [
        ...createRows(values.AcademicYear, "AcademicYear"),
        ...createRows(values.Term, "Term"),
        ...createRows(values.HighStatsLevels, "HighStatsLevels"),
        ...createRows(values.LearningArea, "LearningArea"),
        ...createRows(values.Level, "Level"),
        ...createRows(values.AwardLevel, "AwardLevel"),
        ...createRows(values.AwardType, "AwardType"),
      ];

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "บันทึกไม่สำเร็จ");
        return;
      }
      alert("บันทึกการตั้งค่าเรียบร้อย");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-slate-700 border-b pb-2">
        ตั้งค่าตัวเลือกในแบบฟอร์ม
      </h2>
      {(
        [
          ["AcademicYear", "ปีการศึกษา (คั่นด้วยจุลภาค)"],
          ["Term", "ภาคเรียน"],
          ["HighStatsLevels", "ระดับสูงสำหรับสถิติหน้าแรก"],
          ["LearningArea", "กลุ่มสาระการเรียนรู้"],
          ["Level", "ระดับการแข่งขัน"],
          ["AwardLevel", "ระดับเหรียญรางวัล"],
          ["AwardType", "ประเภทรางวัล"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
          <textarea
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg p-2.5 h-16"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={busy}
        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg font-medium"
      >
        {busy ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </button>
    </form>
  );
}
