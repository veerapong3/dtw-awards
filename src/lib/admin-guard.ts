import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export async function guardAdmin() {
  const user = await requireAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
