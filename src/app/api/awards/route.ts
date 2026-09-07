import { NextResponse } from "next/server";
import { getRecordById, getRecords, saveRecord } from "@/lib/data";
import { getClientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/auth";
import type { SaveAwardInput } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || "";
  const area = searchParams.get("area") || "";
  const bypass = searchParams.get("refresh") === "1";

  let records = await getRecords(bypass);
  if (year) records = records.filter((r) => r.academicYear === year);
  if (area) records = records.filter((r) => r.learningArea === area);

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limited = rateLimit(`submit:${ip}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, message: "ส่งข้อมูลบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as SaveAwardInput;
    const existing = body.id ? await getRecordById(body.id) : null;
    if (existing) {
      const admin = await requireAdmin();
      if (!admin) {
        return NextResponse.json(
          { success: false, message: "ต้องเข้าสู่ระบบเพื่อแก้ไขข้อมูล" },
          { status: 401 },
        );
      }
    }

    const imageCount = body.imageUrls?.length || body.images?.length || 0;
    if (!existing && imageCount < 3) {
      return NextResponse.json(
        { success: false, message: "กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 3 รูป" },
        { status: 400 },
      );
    }

    const record = await saveRecord(body);
    return NextResponse.json({ success: true, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
