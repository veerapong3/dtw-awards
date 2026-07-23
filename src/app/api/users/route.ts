import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from "@/lib/data";
import type { SaveAdminUserInput } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const users = await getAdminUsers();
  return NextResponse.json({ success: true, users });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveAdminUserInput;
    await createAdminUser(body);
    const users = await getAdminUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "เพิ่มผู้ใช้ไม่สำเร็จ",
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveAdminUserInput;
    await updateAdminUser(body);
    const users = await getAdminUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "แก้ไขผู้ใช้ไม่สำเร็จ",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const username = new URL(request.url).searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ success: false, message: "กรุณาระบุชื่อผู้ใช้" }, { status: 400 });
  }

  try {
    await deleteAdminUser(username, admin.username);
    const users = await getAdminUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "ลบผู้ใช้ไม่สำเร็จ",
      },
      { status: 400 },
    );
  }
}
