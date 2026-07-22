import { AdminNav } from "@/components/AdminNav";
import { ReportsPanel } from "@/components/ReportsPanel";
import { guardAdmin } from "@/lib/admin-guard";
import { getRecords, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await guardAdmin();
  const [settings, records] = await Promise.all([getSettings(), getRecords(true)]);

  return (
    <>
      <AdminNav />
      <ReportsPanel settings={settings} totalRecords={records.length} />
    </>
  );
}
