import { AdminNav } from "@/components/AdminNav";
import { SettingsForm } from "@/components/SettingsForm";
import { guardAdmin } from "@/lib/admin-guard";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await guardAdmin();
  const settings = await getSettings(true);
  return (
    <>
      <AdminNav />
      <SettingsForm settings={settings} />
    </>
  );
}
