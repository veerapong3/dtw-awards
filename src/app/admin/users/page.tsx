import { AdminNav } from "@/components/AdminNav";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { guardAdmin } from "@/lib/admin-guard";
import { getAdminUsers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await guardAdmin();
  const users = await getAdminUsers();

  return (
    <>
      <AdminNav />
      <AdminUsersPanel users={users} currentUsername={currentUser.username} />
    </>
  );
}
