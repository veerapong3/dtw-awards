import { NextResponse } from "next/server";
import { uploadEventImage } from "@/lib/data";
import { IMAGE_UPLOAD, getClientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limited = rateLimit(`upload:${ip}`, 60, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, message: "อัปโหลดบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429 },
    );
  }

  try {
    const form = await request.formData();
    const folderId = String(form.get("folderId") || "").trim();
    const filename = String(form.get("filename") || "").trim().replace(/[/\\:*?"<>|]/g, "_");
    const kind = String(form.get("kind") || "image");
    const file = form.get("file");

    if (!folderId || !filename || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไฟล์ไม่ครบ" },
        { status: 400 },
      );
    }

    const isPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (kind === "certificate") {
      if (!isImage && !isPdf) {
        return NextResponse.json(
          { success: false, message: "เกียรติบัตรต้องเป็นไฟล์รูปหรือ PDF" },
          { status: 400 },
        );
      }
    } else if (!isImage) {
      return NextResponse.json(
        { success: false, message: "อัปโหลดได้เฉพาะไฟล์รูปภาพ" },
        { status: 400 },
      );
    }

    if (file.size > IMAGE_UPLOAD.maxBytes) {
      return NextResponse.json(
        { success: false, message: "ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 3.5MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadEventImage({
      folderId,
      filename,
      buffer,
      mimeType: isPdf ? "application/pdf" : file.type || "image/jpeg",
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
