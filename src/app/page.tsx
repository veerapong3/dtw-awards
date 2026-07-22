import { ShowcaseView } from "@/components/ShowcaseView";
import { getRecords, getSettings } from "@/lib/data";
import { isMockMode } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [records, settings] = await Promise.all([getRecords(), getSettings()]);

  return (
    <div className="space-y-4">
      {isMockMode() ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          โหมดทดสอบ (Mock) — ยังไม่ได้เชื่อม Google Sheets/Drive ตั้งค่าใน{" "}
          <code className="font-mono">.env.local</code> แล้วเปลี่ยน{" "}
          <code className="font-mono">USE_MOCK=false</code>
        </div>
      ) : null}
      <ShowcaseView records={records} settings={settings} />
    </div>
  );
}
