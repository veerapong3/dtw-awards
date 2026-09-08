import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRecordById, prepareEventUpload } from "@/lib/data";
import { getClientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limited = rateLimit(`submit-prepare:${ip}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, message: "ส่งข้อมูลบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as {
      startDate?: string;
      activityName?: string;
      id?: string;
    };

    if (body.id) {
      const existing = await getRecordById(body.id);
      if (existing) {
        const admin = await requireAdmin();
        if (!admin) {
          return NextResponse.json(
            { success: false, message: "ต้องเข้าสู่ระบบเพื่อแก้ไขข้อมูล" },
            { status: 401 },
          );
        }
      }
    }

    const prepared = await prepareEventUpload({
      startDate: body.startDate,
      activityName: body.activityName,
      id: body.id,
    });

    return NextResponse.json({ success: true, ...prepared });
  } catch (error) {
    const message = error instanceof Error ? error.message : "เตรียมอัปโหลดไม่สำเร็จ";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
