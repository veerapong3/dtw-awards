import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authenticateUser } from "@/lib/data";
import { getClientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limited = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, message: "ลองเข้าสู่ระบบบ่อยเกินไป" },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() || "";
  const password = body.password || "";

  const user = await authenticateUser(username, password);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 },
    );
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.user = user;
  await session.save();

  return NextResponse.json({ success: true, user });
}
