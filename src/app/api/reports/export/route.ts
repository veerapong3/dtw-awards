import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRecords } from "@/lib/data";
import { buildExcelBuffer } from "@/lib/excel-export";
import {
  buildActivityRows,
  buildFilename,
  buildStudentRows,
  buildSummaryFlatRows,
  filterRecords,
  rowsToCsv,
  type ReportFilters,
  type ReportType,
} from "@/lib/reports";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "activities") as ReportType;
  const format = (searchParams.get("format") || "xlsx") as "csv" | "xlsx";

  if (!["activities", "students", "summary"].includes(type)) {
    return NextResponse.json({ success: false, message: "ประเภทรายงานไม่ถูกต้อง" }, { status: 400 });
  }
  if (!["csv", "xlsx"].includes(format)) {
    return NextResponse.json({ success: false, message: "รูปแบบไฟล์ไม่ถูกต้อง" }, { status: 400 });
  }

  const filters: ReportFilters = {
    academicYear: searchParams.get("year") || undefined,
    term: searchParams.get("term") || undefined,
    learningArea: searchParams.get("area") || undefined,
    level: searchParams.get("level") || undefined,
  };

  const records = filterRecords(await getRecords(true), filters);
  const filename = buildFilename(type, format, filters);

  if (format === "csv") {
    let rows: Record<string, string | number>[] = [];
    if (type === "activities") rows = buildActivityRows(records);
    else if (type === "students") rows = buildStudentRows(records);
    else rows = buildSummaryFlatRows(records);

    const csv = rowsToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  }

  const buffer = await buildExcelBuffer(type, records);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
