"use client";

import { useMemo, useState } from "react";
import type { AwardRecord, SystemSettings } from "@/lib/types";
import { formatThaiDate, parseRecordDate } from "@/lib/utils";

type Props = {
  records: AwardRecord[];
  settings: SystemSettings;
};

export function ShowcaseView({ records, settings }: Props) {
  const [area, setArea] = useState("");
  const [year, setYear] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [gallery, setGallery] = useState<AwardRecord | null>(null);

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (area && r.learningArea !== area) return false;
        if (year && r.academicYear !== year) return false;
        return true;
      })
      .sort((a, b) => parseRecordDate(b.startDate) - parseRecordDate(a.startDate));
  }, [records, area, year]);

  const highLevels = settings.HighStatsLevels?.length
    ? settings.HighStatsLevels
    : ["ระดับชาติ", "ระดับนานาชาติ"];

  const uniqueStudents = new Set<string>();
  const uniqueTeachers = new Set<string>();
  let highCount = 0;
  for (const rec of records) {
    rec.students?.forEach((s) => s.name && uniqueStudents.add(s.name.trim()));
    rec.teachers?.forEach((t) => t && uniqueTeachers.add(t.trim()));
    if (highLevels.includes(rec.level)) highCount += 1;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon="🏆" label="ผลงานความสำเร็จ" value={records.length} unit="รายการ" />
        <Kpi icon="🎓" label="นักเรียนที่รับรางวัล" value={uniqueStudents.size} unit="คน (ไม่ซ้ำ)" />
        <Kpi icon="👨‍🏫" label="ครูฝึกสอน/ผู้ควบคุม" value={uniqueTeachers.size} unit="คน (ไม่ซ้ำ)" />
        <Kpi
          icon="🌏"
          label={`ผลงาน ${highLevels.join("/")}`}
          value={highCount}
          unit="รายการ"
        />
      </div>

      <div className="text-center py-2">
        <h1 className="text-3xl font-bold text-emerald-800">ทำเนียบผลงานและความภาคภูมิใจ</h1>
        <p className="text-slate-600 mt-1">
          ประมวลภาพกิจกรรมและการแข่งขันทางวิชาการ ครูและนักเรียนดอนตาลวิทยา
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto flex-grow">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            กลุ่มสาระการเรียนรู้
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          >
            <option value="">ทั้งหมด</option>
            {settings.LearningArea.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-slate-500 mb-1">ปีการศึกษา</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          >
            <option value="">ทั้งหมด</option>
            {settings.AcademicYear.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">ยังไม่พบประวัติผลงานในระบบ</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((rec) => {
            const cover = rec.imageUrls[0] || "/placeholder-award.svg";
            const limit = 3;
            const showAll = expanded[rec.id];
            const visible = showAll ? rec.students : rec.students.slice(0, limit);
            const hiddenCount = rec.students.length - limit;

            return (
              <article
                key={rec.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-100 flex flex-col overflow-hidden"
              >
                <div className="relative h-52 bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover}
                    alt={rec.activityName}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-4 right-4 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    {rec.level}
                  </span>
                </div>
                <div className="p-6 space-y-2.5 flex-grow">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-emerald-700">
                      กลุ่มสาระฯ {rec.learningArea}
                    </span>
                    <span>
                      ปี {rec.academicYear} / เทอม {rec.term}
                    </span>
                  </div>
                  <h2 className="font-extrabold text-slate-900 text-[16px] leading-snug line-clamp-2 min-h-[44px]">
                    {rec.activityName}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map((s, idx) => {
                      const parts = [s.level, s.type !== "ไม่มีอันดับ" ? s.type : ""]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <span
                          key={`${rec.id}-${idx}`}
                          className="inline-flex items-center bg-emerald-50 text-emerald-800 text-[11px] px-2.5 py-1 rounded-full font-semibold border border-emerald-100"
                        >
                          {s.name}
                          {parts ? (
                            <span className="text-emerald-600 font-bold ml-1">({parts})</span>
                          ) : null}
                        </span>
                      );
                    })}
                    {!showAll && hiddenCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [rec.id]: true }))
                        }
                        className="text-[11px] font-bold text-emerald-600"
                      >
                        ...และอีก +{hiddenCount} คน
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-50">
                    <span>
                      ครูผู้ฝึกสอน:{" "}
                      <span className="font-medium text-slate-700">
                        {rec.teachers.length ? rec.teachers.join(", ") : "ไม่มีรายชื่อ"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="px-6 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    จ. {rec.province} · {formatThaiDate(rec.startDate)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGallery(rec)}
                    className="font-bold text-emerald-600 hover:text-emerald-800"
                  >
                    ภาพผลงาน ({rec.imageUrls.length})
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {gallery ? (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{gallery.activityName}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  สถานที่จัด: {gallery.location} จ. {gallery.province}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGallery(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {gallery.imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full rounded-lg border object-cover" />
                </a>
              ))}
            </div>
            {gallery.certUrl ? (
              <a
                href={gallery.certUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex px-3 py-2 bg-emerald-700 text-white text-sm rounded-lg"
              >
                เปิดเกียรติบัตร
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  unit,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div>
        <span className="text-xs font-semibold text-slate-400 block">{label}</span>
        <span className="text-2xl font-bold text-slate-800">{value}</span>{" "}
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
