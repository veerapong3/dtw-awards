import { StatsView } from "@/components/StatsView";
import { getRecords } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const records = await getRecords();
  return <StatsView records={records} />;
}
