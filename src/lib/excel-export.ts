import ExcelJS from "exceljs";
import {
  buildActivityRows,
  buildStudentRows,
  buildSummaryRows,
  type ReportType,
} from "./reports";
import type { AwardRecord } from "./types";

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: Record<string, string | number>[],
) {
  const sheet = workbook.addWorksheet(name);
  if (rows.length === 0) {
    sheet.addRow(["ไม่มีข้อมูล"]);
    return;
  }
  const headers = Object.keys(rows[0]);
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD1FAE5" },
  };
  for (const row of rows) {
    sheet.addRow(headers.map((h) => row[h] ?? ""));
  }
  sheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = Math.min(len, 40);
    });
    col.width = max + 2;
  });
}

export async function buildExcelBuffer(
  type: ReportType,
  records: AwardRecord[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DTW Awards";
  workbook.created = new Date();

  if (type === "activities") {
    addSheet(workbook, "รายการกิจกรรม", buildActivityRows(records));
  } else if (type === "students") {
    addSheet(workbook, "รายคน", buildStudentRows(records));
  } else {
    const summary = buildSummaryRows(records);
    addSheet(workbook, "ภาพรวม", summary.overview);
    addSheet(workbook, "ตามกลุ่มสาระ", summary.areaRows);
    addSheet(workbook, "ตามระดับ", summary.levelRows);
    addSheet(workbook, "ตามปีการศึกษา", summary.yearRows);
    addSheet(workbook, "Top นักเรียน", summary.topStudents);
    addSheet(workbook, "Top ครู", summary.topTeachers);
    addSheet(workbook, "รายการกิจกรรม", buildActivityRows(records));
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
