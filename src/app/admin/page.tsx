import { AdminAwardsTable } from "@/components/AdminAwardsTable";
import { AdminNav } from "@/components/AdminNav";
import { guardAdmin } from "@/lib/admin-guard";
import { getRecords } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await guardAdmin();
  const records = await getRecords(true);

  return (
    <>
      <AdminNav />
      <AdminAwardsTable records={records} />
    </>
  );
}
