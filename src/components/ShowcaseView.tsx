"use client";

import { useMemo, useState } from "react";
import type { AwardRecord, Student, SystemSettings, Teacher } from "@/lib/types";
import { formatThaiDate, parseRecordDate } from "@/lib/utils";

type Props = {
  records: AwardRecord[];
  settings: SystemSettings;
  students: Student[];
  teachers: Teacher[];
};

export function ShowcaseView({ records, settings, students, teachers }: Props) {
  const [area, setArea] = useState("");
  const [year, setYear] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [gallery, setGallery] = useState<AwardRecord | null>(null);

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (area && r.learningArea !== area) return false;
        if (year && r.academicYear !== year) return false;
        if (selectedLevel && r.level !== selectedLevel) return false;
        return true;
      })
      .sort((a, b) => parseRecordDate(b.startDate) - parseRecordDate(a.startDate));
  }, [records, area, year, selectedLevel]);

  function selectLevel(next: string) {
    setSelectedLevel((current) => (current === next ? "" : next));
    requestAnimationFrame(() => {
      document.getElementById("award-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const awardLevels = settings.Level?.length
    ? settings.Level
    : ["ระดับเขตพื้นที่", "ระดับจังหวัด", "ระดับภาค", "ระดับชาติ", "ระดับนานาชาติ"];

  const uniqueStudents = new Set<string>();
  const uniqueTeachers = new Set<string>();
  const levelCounts: Record<string, number> = {};
  for (const rec of records) {
    rec.students?.forEach((s) => s.name && uniqueStudents.add(s.name.trim()));
    rec.teachers?.forEach((t) => t && uniqueTeachers.add(t.trim()));
    if (rec.level) levelCounts[rec.level] = (levelCounts[rec.level] || 0) + 1;
  }
  const extraLevels = Object.keys(levelCounts).filter((level) => !awardLevels.includes(level));
  const levelRows = [...awardLevels, ...extraLevels];

  const competingStudents = countRosterMatches(
    uniqueStudents,
    students.map((s) => [`${s.prefix}${s.fullName} (${s.className})`, `${s.prefix}${s.fullName}`, s.fullName]),
  );
  const competingTeachers = countRosterMatches(
    uniqueTeachers,
    teachers.map((t) => [`${t.prefix}${t.fullName} (${t.learningArea})`, `${t.prefix}${t.fullName}`, t.fullName]),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background:
                "linear-gradient(90deg, #38bdf8, #14b8a6, #6366f1, #f59e0b, #8b5cf6)",
            }}
          />
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                ภาพรวมผลงาน
              </p>
              <h2 className="text-lg font-bold text-slate-800">ผลงานตามระดับการแข่งขัน</h2>
            </div>
            <div className="rounded-full bg-slate-900 text-white px-3 py-1 text-sm font-bold">
              {records.length}{" "}
              <span className="font-medium text-slate-300">รายการทั้งหมด</span>
            </div>
          </div>
          {records.length > 0 ? (
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 mb-5">
              {levelRows.map((level) => {
                const count = levelCounts[level] || 0;
                if (!count) return null;
                const theme = levelTheme(level);
                return (
                  <div
                    key={`bar-${level}`}
                    className={`${theme.bar} transition-all`}
                    style={{ width: `${(count / records.length) * 100}%` }}
                    title={`${level}: ${count}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-2.5 rounded-full bg-slate-100 mb-5" />
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {levelRows.map((level) => {
              const count = levelCounts[level] || 0;
              const percent = percentOf(count, records.length) ?? "0";
              const theme = levelTheme(level);
              const ratio = records.length ? Math.min(100, (count / records.length) * 100) : 0;
              return (
                <button
                  type="button"
                  key={level}
                  onClick={() => selectLevel(level)}
                  className={`group w-full text-left rounded-2xl border px-3.5 py-4 transition hover:-translate-y-0.5 hover:shadow-md ${theme.tile} ${
                    level === selectedLevel ? `ring-2 ring-offset-2 ${theme.ring}` : ""
                  }`}
                  aria-pressed={level === selectedLevel}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${theme.iconWrap}`}
                    >
                      {theme.icon}
                    </span>
                    <span className={`text-[12px] font-bold leading-tight ${theme.text}`}>
                      {level.replace(/^ระดับ/, "")}
                    </span>
                  </div>
                  <div className={`text-3xl font-extrabold tracking-tight ${theme.text}`}>
                    {count}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">รายการ</span>
                    <span className={`font-bold ${theme.text}`}>{percent}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
                    <div
                      className={`h-full rounded-full ${theme.bar}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Kpi
            icon="🎓"
            label="นักเรียนที่ไปแข่ง"
            value={uniqueStudents.size}
            unit="คน (ไม่ซ้ำ)"
            percent={percentOf(competingStudents, students.length)}
            percentHint={students.length ? `จากนักเรียนทั้งหมด ${students.length} คน` : undefined}
          />
          <Kpi
            icon="👨‍🏫"
            label="ครูที่ไปแข่ง"
            value={uniqueTeachers.size}
            unit="คน (ไม่ซ้ำ)"
            percent={percentOf(competingTeachers, teachers.length)}
            percentHint={teachers.length ? `จากครูทั้งหมด ${teachers.length} คน` : undefined}
          />
        </div>
      </div>

      <div className="text-center py-2">
        <h1 className="text-3xl font-bold text-emerald-800">ทำเนียบผลงานและความภาคภูมิใจ</h1>
        <p className="text-slate-600 mt-1">
          ประมวลภาพกิจกรรมและการแข่งขันทางวิชาการ ครูและนักเรียนดอนตาลวิทยา
        </p>
      </div>

      <div
        id="award-list"
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end"
      >
        <div className="w-full sm:w-auto flex-grow min-w-[180px]">
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
        <div className="w-full sm:w-auto min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            ระดับการแข่งขัน
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          >
            <option value="">ทั้งหมด</option>
            {levelRows.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto min-w-[140px]">
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
        {area || year || selectedLevel ? (
          <button
            type="button"
            onClick={() => {
              setArea("");
              setYear("");
              setSelectedLevel("");
            }}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ล้างตัวกรอง
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-500">
        พบ {filtered.length} รายการ
        {selectedLevel ? ` · ${selectedLevel}` : ""}
      </p>

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
                  <span
                    className={`absolute top-4 right-4 text-[11px] font-bold px-3 py-1 rounded-full shadow-sm ${levelTheme(rec.level).badge}`}
                  >
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

function levelTheme(level: string) {
  const key = (level || "").replace(/^ระดับ/, "");
  if (key.includes("นานาชาติ")) {
    return {
      icon: "🌏",
      tile: "bg-violet-50 border-violet-100",
      iconWrap: "bg-violet-100",
      bar: "bg-violet-500",
      text: "text-violet-800",
      badge: "bg-violet-600 text-white",
      ring: "ring-violet-400",
    };
  }
  if (key.includes("ชาติ")) {
    return {
      icon: "🏅",
      tile: "bg-amber-50 border-amber-100",
      iconWrap: "bg-amber-100",
      bar: "bg-amber-500",
      text: "text-amber-800",
      badge: "bg-amber-500 text-white",
      ring: "ring-amber-400",
    };
  }
  if (key.includes("ภาค")) {
    return {
      icon: "🚩",
      tile: "bg-indigo-50 border-indigo-100",
      iconWrap: "bg-indigo-100",
      bar: "bg-indigo-500",
      text: "text-indigo-800",
      badge: "bg-indigo-600 text-white",
      ring: "ring-indigo-400",
    };
  }
  if (key.includes("จังหวัด")) {
    return {
      icon: "🗺️",
      tile: "bg-teal-50 border-teal-100",
      iconWrap: "bg-teal-100",
      bar: "bg-teal-500",
      text: "text-teal-800",
      badge: "bg-teal-600 text-white",
      ring: "ring-teal-400",
    };
  }
  if (key.includes("เขต")) {
    return {
      icon: "🏫",
      tile: "bg-sky-50 border-sky-100",
      iconWrap: "bg-sky-100",
      bar: "bg-sky-500",
      text: "text-sky-800",
      badge: "bg-sky-600 text-white",
      ring: "ring-sky-400",
    };
  }
  return {
    icon: "🏆",
    tile: "bg-slate-50 border-slate-100",
    iconWrap: "bg-slate-100",
    bar: "bg-slate-500",
    text: "text-slate-800",
    badge: "bg-slate-700 text-white",
    ring: "ring-slate-400",
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function countRosterMatches(entries: Set<string>, rosterLabels: string[][]) {
  const names = [...entries].map(normalizeName);
  return rosterLabels.filter((labels) =>
    labels.some((label) => {
      const key = normalizeName(label);
      if (!key) return false;
      return names.some((name) => name === key || name.includes(key));
    }),
  ).length;
}

function percentOf(part: number, total: number) {
  if (!total) return null;
  const value = Math.min(100, (part / total) * 100);
  return value % 1 === 0 ? `${value}` : value.toFixed(1);
}

function Kpi({
  icon,
  label,
  value,
  unit,
  percent,
  percentHint,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  percent?: string | null;
  percentHint?: string;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold text-slate-400 block">{label}</span>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span>
            <span className="text-2xl font-bold text-slate-800">{value}</span>{" "}
            <span className="text-xs text-slate-400">{unit}</span>
          </span>
          {percent != null ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-bold text-emerald-700">
              {percent}%
            </span>
          ) : null}
        </div>
        {percentHint ? <span className="text-[11px] text-slate-400">{percentHint}</span> : null}
      </div>
    </div>
  );
}
