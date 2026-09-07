"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AwardRecord, Student, SystemSettings, Teacher } from "@/lib/types";
import { PROVINCES } from "@/lib/types";
import { MAX_ACTIVITY_IMAGES, canonicalLevel, extensionForMime, prepareCertificateFile, prepareImageFile } from "@/lib/utils";

type Props = {
  settings: SystemSettings;
  students: Student[];
  teachers: Teacher[];
  mode?: "public" | "admin";
  initial?: AwardRecord | null;
};

type StudentRow = { name: string; level: string; type: string };

export function AwardForm({
  settings,
  students,
  teachers,
  mode = "public",
  initial = null,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [academicYear, setAcademicYear] = useState(initial?.academicYear || "");
  const [term, setTerm] = useState(initial?.term || "");
  const [learningArea, setLearningArea] = useState(initial?.learningArea || "");
  const [activityName, setActivityName] = useState(initial?.activityName || "");
  const [level, setLevel] = useState(canonicalLevel(initial?.level || ""));
  const [startDate, setStartDate] = useState(toInputDate(initial?.startDate));
  const [endDate, setEndDate] = useState(toInputDate(initial?.endDate));
  const [location, setLocation] = useState(initial?.location || "");
  const [province, setProvince] = useState(initial?.province || "");
  const [studentRows, setStudentRows] = useState<StudentRow[]>(
    initial?.students?.length
      ? initial.students
      : [{ name: "", level: "", type: "" }],
  );
  const [teacherRows, setTeacherRows] = useState<string[]>(
    initial?.teachers?.length ? initial.teachers : [""],
  );

  useEffect(() => {
    if (!message || busy) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message, busy]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const form = e.target as HTMLFormElement;
      const imageInput = form.elements.namedItem("images") as HTMLInputElement;
      const certInput = form.elements.namedItem("certificate") as HTMLInputElement;
      const files = Array.from(imageInput.files || []);

      if (!initial && files.length < 3) {
        setMessage({ type: "err", text: "กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 3 รูป" });
        setBusy(false);
        return;
      }
      if (files.length > MAX_ACTIVITY_IMAGES) {
        setMessage({ type: "err", text: `อัปโหลดรูปภาพกิจกรรมได้ไม่เกิน ${MAX_ACTIVITY_IMAGES} รูป` });
        setBusy(false);
        return;
      }

      const preparedImages: File[] = [];
      for (let i = 0; i < files.length; i++) {
        setMessage({ type: "ok", text: `กำลังเตรียมรูปภาพ ${i + 1}/${files.length}...` });
        preparedImages.push(await prepareImageFile(files[i]));
      }

      let preparedCert: File | null = null;
      if (certInput.files?.[0]) {
        setMessage({ type: "ok", text: "กำลังเตรียมไฟล์เกียรติบัตร..." });
        preparedCert = await prepareCertificateFile(certInput.files[0]);
      }

      let imageUrls: string[] | undefined;
      let certUrl: string | undefined;
      let recordId = initial?.id;

      if (preparedImages.length || preparedCert) {
        setMessage({ type: "ok", text: "กำลังเตรียมอัปโหลด..." });
        const prepRes = await fetch("/api/awards/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: initial?.id,
            startDate,
            activityName,
          }),
        });
        const prep = await prepRes.json();
        if (!prepRes.ok || !prep.success) {
          throw new Error(prep.message || "เตรียมอัปโหลดไม่สำเร็จ");
        }
        recordId = prep.id;

        imageUrls = [];
        for (let i = 0; i < preparedImages.length; i++) {
          setMessage({ type: "ok", text: `กำลังอัปโหลดรูปภาพ ${i + 1}/${preparedImages.length}...` });
          const file = preparedImages[i];
          imageUrls.push(
            await uploadPreparedFile(
              prep.folderId,
              `${prep.id}_img_${i}_${Date.now()}${extensionForMime(file.type, file.name)}`,
              file,
            ),
          );
        }

        if (preparedCert) {
          setMessage({ type: "ok", text: "กำลังอัปโหลดเกียรติบัตร..." });
          certUrl = await uploadPreparedFile(
            prep.folderId,
            `${prep.id}_cert_${Date.now()}${extensionForMime(preparedCert.type, preparedCert.name)}`,
            preparedCert,
            "certificate",
          );
        }

        if (!initial && imageUrls.length < 3) {
          throw new Error("กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 3 รูป");
        }

        setMessage({ type: "ok", text: "กำลังบันทึกข้อมูล..." });
      }

      const payload = {
        id: recordId,
        academicYear,
        term,
        learningArea,
        activityName,
        level,
        startDate,
        endDate,
        location,
        province,
        students: studentRows.filter((s) => s.name.trim()),
        teachers: teacherRows.filter((t) => t.trim()),
        imageUrls,
        certUrl,
      };

      const url = initial ? `/api/awards/${initial.id}` : "/api/awards";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "บันทึกไม่สำเร็จ");
      }

      setMessage({
        type: "ok",
        text: initial ? "บันทึกการแก้ไขเรียบร้อย" : "บันทึกผลงานเรียบร้อย แสดงบนหน้าแรกทันที",
      });

      if (!initial) {
        form.reset();
        setStudentRows([{ name: "", level: "", type: "" }]);
        setTeacherRows([""]);
        setAcademicYear("");
        setTerm("");
        setLearningArea("");
        setActivityName("");
        setLevel("");
        setStartDate("");
        setEndDate("");
        setLocation("");
        setProvince("");
      }

      router.refresh();
      if (mode === "public") {
        setTimeout(() => router.push("/"), 800);
      } else if (mode === "admin" && initial) {
        setTimeout(() => router.push("/admin"), 800);
      }
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-emerald-800 border-b pb-2">
          {initial ? `แก้ไขผลงาน: ${initial.activityName}` : "ฟอร์มเพิ่มข้อมูลการแข่งขันและผลงาน"}
        </h1>
        {mode === "public" ? (
          <p className="text-sm text-slate-500 mt-2">
            ไม่ต้องเข้าสู่ระบบ — หลังบันทึกจะแสดงบนหน้าโชว์ผลงานทันที
          </p>
        ) : null}
      </div>

      {message ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-rose-50 text-rose-800 border border-rose-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="ปีการศึกษา"
          required
          value={academicYear}
          onChange={setAcademicYear}
          options={settings.AcademicYear}
        />
        <Select label="ภาคเรียน" required value={term} onChange={setTerm} options={settings.Term} />
        <Select
          label="กลุ่มสาระการเรียนรู้"
          required
          value={learningArea}
          onChange={setLearningArea}
          options={settings.LearningArea}
        />
      </div>

      <Field label="รายการแข่งขัน / กิจกรรมเข้าร่วม" required>
        <input
          required
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="ตัวอย่าง: การแข่งขันคณิตคิดเร็ว สพฐ."
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="ระดับการแข่งขัน"
          required
          value={level}
          onChange={setLevel}
          options={settings.Level}
        />
        <Field label="วันที่เริ่มต้น" required>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </Field>
        <Field label="วันที่สิ้นสุด" required>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="สถานที่จัดงาน" required>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </Field>
        <Select
          label="จังหวัด"
          required
          value={province}
          onChange={setProvince}
          options={PROVINCES}
        />
      </div>

      <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-700 text-sm">รายชื่อนักเรียนที่ได้รับรางวัล</div>
            <div className="text-xs text-slate-400">พิมพ์ค้นชื่อจากฐานข้อมูลนักเรียน</div>
          </div>
          <button
            type="button"
            onClick={() => setStudentRows((rows) => [...rows, { name: "", level: "", type: "" }])}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-500"
          >
            เพิ่มรายชื่อ
          </button>
        </div>
        <datalist id="students-datalist">
          {students.map((s) => (
            <option
              key={s.studentId}
              value={`${s.prefix}${s.fullName} (${s.className})`}
            />
          ))}
        </datalist>
        {studentRows.map((row, index) => (
          <div
            key={index}
            className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-slate-200"
          >
            <input
              list="students-datalist"
              required
              value={row.name}
              onChange={(e) =>
                setStudentRows((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
                )
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-grow min-w-[200px]"
              placeholder="พิมพ์ชื่อนักเรียน..."
            />
            <select
              value={row.level}
              onChange={(e) =>
                setStudentRows((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, level: e.target.value } : r)),
                )
              }
              className="w-full sm:w-auto border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- ระดับรางวัล --</option>
              {settings.AwardLevel.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={row.type}
              onChange={(e) =>
                setStudentRows((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, type: e.target.value } : r)),
                )
              }
              className="w-full sm:w-auto border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- อันดับรางวัล --</option>
              {settings.AwardType.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setStudentRows((rows) => rows.filter((_, i) => i !== index))}
              className="text-rose-600 px-2"
            >
              ลบ
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-700 text-sm">รายชื่อครูผู้ฝึกสอน / ผู้ควบคุม</div>
          </div>
          <button
            type="button"
            onClick={() => setTeacherRows((rows) => [...rows, ""])}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-500"
          >
            เพิ่มรายชื่อครู
          </button>
        </div>
        <datalist id="teachers-datalist">
          {teachers.map((t) => (
            <option
              key={t.teacherId}
              value={`${t.prefix}${t.fullName} (${t.learningArea})`}
            />
          ))}
        </datalist>
        {teacherRows.map((name, index) => (
          <div
            key={index}
            className="flex gap-2 items-center bg-white p-3 rounded-lg border border-slate-200"
          >
            <input
              list="teachers-datalist"
              required
              value={name}
              onChange={(e) =>
                setTeacherRows((rows) =>
                  rows.map((r, i) => (i === index ? e.target.value : r)),
                )
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-grow"
              placeholder="พิมพ์ชื่อคุณครู..."
            />
            <button
              type="button"
              onClick={() => setTeacherRows((rows) => rows.filter((_, i) => i !== index))}
              className="text-rose-600 px-2"
            >
              ลบ
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-dashed border-emerald-300 bg-emerald-50/30 rounded-lg">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            ภาพกิจกรรม (บังคับ 3-5 รูป) {!initial ? <span className="text-red-500">*</span> : null}
          </label>
          <input
            name="images"
            type="file"
            multiple
            accept="image/*"
            required={!initial}
            className="w-full text-sm"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            ระบบเก็บรายละเอียดต้นฉบับให้มากที่สุด และย่อเฉพาะเมื่อไฟล์ใหญ่เกินกว่าที่อัปโหลดได้
            {initial ? " — แก้ไขไม่บังคับแนบรูปใหม่" : ""}
          </span>
        </div>
        <div className="p-4 border border-dashed border-slate-300 bg-slate-50/50 rounded-lg">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            ไฟล์เกียรติบัตร (ถ้ามี)
          </label>
          <input
            name="certificate"
            type="file"
            accept="image/*,application/pdf"
            className="w-full text-sm"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            รองรับไฟล์รูปหรือ PDF ไม่เกิน 3.5MB
          </span>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          type="submit"
          disabled={busy}
          className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-lg shadow-md transition"
        >
          {busy ? "กำลังบันทึก..." : initial ? "บันทึกการแก้ไข" : "บันทึกข้อมูลขึ้นระบบ"}
        </button>
      </div>

    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Select({
  label,
  required,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Field label={label} required={required}>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">-- โปรดเลือก --</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

async function uploadPreparedFile(
  folderId: string,
  filename: string,
  file: File,
  kind: "image" | "certificate" = "image",
) {
  const body = new FormData();
  body.append("folderId", folderId);
  body.append("filename", filename);
  body.append("kind", kind);
  body.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.message || "อัปโหลดรูปไม่สำเร็จ");
  }
  return data.url as string;
}

function toInputDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}
