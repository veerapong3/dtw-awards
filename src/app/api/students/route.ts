import { NextResponse } from "next/server";
import { getStudents } from "@/lib/data";

export async function GET() {
  const students = await getStudents();
  return NextResponse.json({ students });
}
