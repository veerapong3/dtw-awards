"use client";

import { useMemo, useState } from "react";
import type { SystemSettings } from "@/lib/types";

type Props = {
  settings: SystemSettings;
  totalRecords: number;
};

export function ReportsPanel({ settings, totalRecords }: Props) {
  const [type, setType] = useState<"activities" | "students" | "summary">("activities");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams({ type });
    if (year) p.set("year", year);
    if (term) p.set("term", term);
    if (area) p.set("area", area);
    if (level) p.set("level", level);
    return p;
  }, [type, year, term, area, level]);

  async function download(format: "csv" | "xlsx") {
    setBusy(format);
    setError("");
    try {
      const res = await fetch(`/api/reports/export?${query.toString()}&format=${format}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "ดาวน์โหลดไม่สำเร็จ");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
      const filename = match ? decodeURIComponent(match[1]) : `report.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-700 border-b pb-2">รายงานสารสนเทศ</h2>
        <p className="text-sm text-slate-500 mt-2">
          ส่งออกข้อมูลผลงานเป็น CSV หรือ Excel ตามตัวกรองที่เลือก (มีข้อมูลในระบบ {totalRecords} รายการ)
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>
      ) : null}

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-2">ประเภทรายงาน</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              ["activities", "รายการกิจกรรม", "หนึ่งแถวต่อกิจกรรม"],
              ["students", "รายคน", "หนึ่งแถวต่อนักเรียน"],
              ["summary", "สรุป", "หลายชีต: สรุป + Top"],
            ] as const
          ).map(([value, title, desc]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`text-left rounded-lg border p-3 transition ${
                type === value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold text-slate-800 text-sm">{title}</div>
              <div className="text-xs text-slate-500 mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FilterSelect
          label="ปีการศึกษา"
          value={year}
          onChange={setYear}
          options={settings.AcademicYear}
          allLabel="ทุกปี"
        />
        <FilterSelect
          label="ภาคเรียน"
          value={term}
          onChange={setTerm}
          options={settings.Term}
          allLabel="ทุกภาคเรียน"
        />
        <FilterSelect
          label="กลุ่มสาระ"
          value={area}
          onChange={setArea}
          options={settings.LearningArea}
          allLabel="ทุกกลุ่มสาระ"
        />
        <FilterSelect
          label="ระดับการแข่งขัน"
          value={level}
          onChange={setLevel}
          options={settings.Level}
          allLabel="ทุกระดับ"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => download("xlsx")}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-lg font-medium text-sm"
        >
          {busy === "xlsx" ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Excel"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => download("csv")}
          className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white rounded-lg font-medium text-sm"
        >
          {busy === "csv" ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด CSV"}
        </button>
      </div>

      <div className="text-xs text-slate-400 border-t pt-3 space-y-1">
        <p>• Excel สรุปจะมีหลายชีต: ภาพรวม, ตามกลุ่มสาระ, ตามระดับ, Top นักเรียน/ครู, รายการกิจกรรม</p>
        <p>• CSV เหมาะนำไปเปิดใน Google Sheets หรือกรองต่อ</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
