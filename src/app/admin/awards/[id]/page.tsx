import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { AwardForm } from "@/components/AwardForm";
import { guardAdmin } from "@/lib/admin-guard";
import { getRecordById, getSettings, getStudents, getTeachers } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditAwardPage({ params }: Props) {
  await guardAdmin();
  const { id } = await params;
  const [record, settings, students, teachers] = await Promise.all([
    getRecordById(id),
    getSettings(),
    getStudents(),
    getTeachers(),
  ]);

  if (!record) notFound();

  return (
    <>
      <AdminNav />
      <AwardForm
        settings={settings}
        students={students}
        teachers={teachers}
        mode="admin"
        initial={record}
      />
    </>
  );
}
