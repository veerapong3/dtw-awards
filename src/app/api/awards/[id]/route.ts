import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteRecord, getRecordById, saveRecord } from "@/lib/data";
import type { SaveAwardInput } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const record = await getRecordById(id);
  if (!record) {
    return NextResponse.json({ message: "ไม่พบข้อมูล" }, { status: 404 });
  }
  return NextResponse.json({ record });
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as SaveAwardInput;
    const record = await saveRecord({ ...body, id });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "แก้ไขไม่สำเร็จ";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteRecord(id);
  if (!ok) {
    return NextResponse.json({ success: false, message: "ไม่พบข้อมูล" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
