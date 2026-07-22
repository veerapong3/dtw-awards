import { AwardForm } from "@/components/AwardForm";
import { getSettings, getStudents, getTeachers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const [settings, students, teachers] = await Promise.all([
    getSettings(),
    getStudents(),
    getTeachers(),
  ]);

  return (
    <AwardForm
      settings={settings}
      students={students}
      teachers={teachers}
      mode="public"
    />
  );
}
