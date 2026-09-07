import type { AwardRecord } from "./types";
import { canonicalLevel, formatThaiDate } from "./utils";

export type ReportFilters = {
  academicYear?: string;
  term?: string;
  learningArea?: string;
  level?: string;
};

export type ReportType = "activities" | "students" | "summary";

export function filterRecords(records: AwardRecord[], filters: ReportFilters) {
  return records.filter((r) => {
    if (filters.academicYear && r.academicYear !== filters.academicYear) return false;
    if (filters.term && r.term !== filters.term) return false;
    if (filters.learningArea && r.learningArea !== filters.learningArea) return false;
    if (filters.level && canonicalLevel(r.level) !== filters.level) return false;
    return true;
  });
}

export function buildActivityRows(records: AwardRecord[]) {
  return records.map((r) => ({
    ปีการศึกษา: r.academicYear,
    ภาคเรียน: r.term,
    กลุ่มสาระ: r.learningArea,
    ชื่อกิจกรรม: r.activityName,
    ระดับการแข่งขัน: canonicalLevel(r.level),
    วันที่เริ่ม: formatThaiDate(r.startDate),
    วันที่สิ้นสุด: formatThaiDate(r.endDate),
    สถานที่: r.location,
    จังหวัด: r.province,
    นักเรียน: (r.students || [])
      .map((s) => {
        const award = [s.level, s.type].filter(Boolean).join(" ");
        return award ? `${s.name} (${award})` : s.name;
      })
      .join("; "),
    จำนวนนักเรียน: r.students?.length || 0,
    ครูผู้ฝึกสอน: (r.teachers || []).join("; "),
    จำนวนรูป: r.imageUrls?.length || 0,
    ลิงก์เกียรติบัตร: r.certUrl || "",
    รหัสรายการ: r.id,
  }));
}

export function buildStudentRows(records: AwardRecord[]) {
  const rows: Record<string, string | number>[] = [];
  for (const r of records) {
    const teachers = (r.teachers || []).join("; ");
    const students = r.students?.length
      ? r.students
      : [{ name: "", level: "", type: "" }];

    for (const s of students) {
      rows.push({
        ชื่อนักเรียน: s.name || "",
        ระดับรางวัล: s.level || "",
        อันดับรางวัล: s.type || "",
        ปีการศึกษา: r.academicYear,
        ภาคเรียน: r.term,
        กลุ่มสาระ: r.learningArea,
        ชื่อกิจกรรม: r.activityName,
        ระดับการแข่งขัน: canonicalLevel(r.level),
        วันที่เริ่ม: formatThaiDate(r.startDate),
        จังหวัด: r.province,
        ครูผู้ฝึกสอน: teachers,
        รหัสรายการ: r.id,
      });
    }
  }
  return rows;
}

export function buildSummaryRows(records: AwardRecord[]) {
  const byArea: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const studentSet = new Set<string>();
  const teacherSet = new Set<string>();

  for (const r of records) {
    byArea[r.learningArea] = (byArea[r.learningArea] || 0) + 1;
    byLevel[canonicalLevel(r.level)] = (byLevel[canonicalLevel(r.level)] || 0) + 1;
    byYear[r.academicYear] = (byYear[r.academicYear] || 0) + 1;
    r.students?.forEach((s) => s.name && studentSet.add(s.name.trim()));
    r.teachers?.forEach((t) => t && teacherSet.add(t.trim()));
  }

  const overview = [
    { รายการ: "จำนวนกิจกรรมทั้งหมด", ค่า: records.length },
    { รายการ: "นักเรียนไม่ซ้ำ", ค่า: studentSet.size },
    { รายการ: "ครูไม่ซ้ำ", ค่า: teacherSet.size },
  ];

  const areaRows = Object.entries(byArea)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ กลุ่มสาระ: k, จำนวนกิจกรรม: v }));

  const levelRows = Object.entries(byLevel)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ ระดับการแข่งขัน: k, จำนวนกิจกรรม: v }));

  const yearRows = Object.entries(byYear)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, v]) => ({ ปีการศึกษา: k, จำนวนกิจกรรม: v }));

  const studentCounts: Record<string, number> = {};
  const teacherCounts: Record<string, number> = {};
  for (const r of records) {
    r.students?.forEach((s) => {
      if (!s.name) return;
      const n = s.name.trim();
      studentCounts[n] = (studentCounts[n] || 0) + 1;
    });
    r.teachers?.forEach((t) => {
      if (!t) return;
      const n = t.trim();
      teacherCounts[n] = (teacherCounts[n] || 0) + 1;
    });
  }

  const topStudents = Object.entries(studentCounts)
    .map(([name, count]) => ({ ชื่อ: name, จำนวนครั้ง: count }))
    .sort((a, b) => b.จำนวนครั้ง - a.จำนวนครั้ง)
    .slice(0, 20);

  const topTeachers = Object.entries(teacherCounts)
    .map(([name, count]) => ({ ชื่อ: name, จำนวนครั้ง: count }))
    .sort((a, b) => b.จำนวนครั้ง - a.จำนวนครั้ง)
    .slice(0, 20);

  return { overview, areaRows, levelRows, yearRows, topStudents, topTeachers };
}

export function buildSummaryFlatRows(records: AwardRecord[]) {
  const s = buildSummaryRows(records);
  return [
    ...s.overview.map((r) => ({ ส่วน: "ภาพรวม", ...r })),
    ...s.areaRows.map((r) => ({ ส่วน: "ตามกลุ่มสาระ", ...r })),
    ...s.levelRows.map((r) => ({ ส่วน: "ตามระดับ", ...r })),
    ...s.yearRows.map((r) => ({ ส่วน: "ตามปีการศึกษา", ...r })),
    ...s.topStudents.map((r) => ({ ส่วน: "Top นักเรียน", ...r })),
    ...s.topTeachers.map((r) => ({ ส่วน: "Top ครู", ...r })),
    ...buildActivityRows(records).map((r) => ({ ส่วน: "รายการกิจกรรม", ...r })),
  ];
}

function escapeCsv(value: string | number) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return "\uFEFFไม่มีข้อมูล";
  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = [...headerSet];
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h] ?? "")).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function buildFilename(
  type: ReportType,
  format: "csv" | "xlsx",
  filters: ReportFilters,
) {
  const date = new Date().toISOString().slice(0, 10);
  const parts = ["DTW_ผลงาน"];
  if (type === "activities") parts.push("รายการกิจกรรม");
  if (type === "students") parts.push("รายคน");
  if (type === "summary") parts.push("สรุป");
  if (filters.academicYear) parts.push(filters.academicYear);
  if (filters.term) parts.push(`เทอม${filters.term}`);
  parts.push(date);
  return `${parts.join("_")}.${format}`;
}
