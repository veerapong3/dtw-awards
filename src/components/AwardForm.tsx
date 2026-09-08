"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AwardRecord, Student, SystemSettings, Teacher } from "@/lib/types";
import { PROVINCES } from "@/lib/types";
import {
  MAX_ACTIVITY_IMAGES,
  canonicalLevel,
  extensionForMime,
  prepareCertificateFile,
  prepareImageFile,
} from "@/lib/utils";

type Props = {
  settings: SystemSettings;
  students: Student[];
  teachers: Teacher[];
  mode?: "public" | "admin";
  initial?: AwardRecord | null;
};

type StudentRow = { name: string; level: string; type: string };

type UploadItem = {
  key: string;
  kind: "image" | "certificate";
  name: string;
  previewUrl: string;
  file: File | null;
  status: "queued" | "preparing" | "uploading" | "done" | "error";
  progress: number;
  url?: string;
  error?: string;
};

type UploadSession = { id: string; folderId: string };

function newItemKey() {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const [imageItems, setImageItems] = useState<UploadItem[]>(
    (initial?.imageUrls || []).map((url, index) => ({
      key: `existing-img-${index}`,
      kind: "image",
      name: `รูปที่ ${index + 1}`,
      previewUrl: url,
      file: null,
      status: "done",
      progress: 100,
      url,
    })),
  );
  const [certItem, setCertItem] = useState<UploadItem | null>(
    initial?.certUrl
      ? {
          key: "existing-cert",
          kind: "certificate",
          name: "เกียรติบัตร",
          previewUrl: initial.certUrl.includes("/file/d/") ? "" : initial.certUrl,
          file: null,
          status: "done",
          progress: 100,
          url: initial.certUrl,
        }
      : null,
  );

  const sessionRef = useRef<UploadSession | null>(
    initial?.id ? { id: initial.id, folderId: "" } : null,
  );
  const imageItemsRef = useRef(imageItems);
  const certItemRef = useRef(certItem);
  const activityNameRef = useRef(activityName);
  const startDateRef = useRef(startDate);
  const processingRef = useRef(false);
  imageItemsRef.current = imageItems;
  certItemRef.current = certItem;
  activityNameRef.current = activityName;
  startDateRef.current = startDate;

  const uploading =
    imageItems.some((item) => item.status === "queued" || item.status === "preparing" || item.status === "uploading") ||
    Boolean(
      certItem &&
        (certItem.status === "queued" || certItem.status === "preparing" || certItem.status === "uploading"),
    );
  const doneImages = imageItems.filter((item) => item.status === "done" && item.url);
  const failedCount = imageItems.filter((item) => item.status === "error").length + (certItem?.status === "error" ? 1 : 0);

  useEffect(() => {
    if (!message || busy) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message, busy]);

  async function ensureSession() {
    const current = sessionRef.current;
    if (current?.id && current.folderId) return current;

    const res = await fetch("/api/awards/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: current?.id || initial?.id,
        startDate: startDateRef.current,
        activityName: activityNameRef.current,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "เตรียมอัปโหลดไม่สำเร็จ");
    }
    const session = { id: data.id as string, folderId: data.folderId as string };
    sessionRef.current = session;
    return session;
  }

  function patchImage(key: string, patch: Partial<UploadItem>) {
    const next = imageItemsRef.current.map((item) =>
      item.key === key ? { ...item, ...patch } : item,
    );
    imageItemsRef.current = next;
    setImageItems(next);
  }

  function patchCert(patch: Partial<UploadItem>) {
    const next = certItemRef.current ? { ...certItemRef.current, ...patch } : certItemRef.current;
    certItemRef.current = next;
    setCertItem(next);
  }

  async function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (true) {
        const nextImage = imageItemsRef.current.find((item) => item.status === "queued");
        const nextCert =
          certItemRef.current?.status === "queued" ? certItemRef.current : null;
        const next = nextImage || nextCert;
        if (!next) break;
        try {
          const session = await ensureSession();
          if (next.kind === "image") patchImage(next.key, { status: "preparing", progress: 8, error: undefined });
          else patchCert({ status: "preparing", progress: 8, error: undefined });

          if (!next.file) throw new Error("ไม่พบไฟล์");
          const prepared =
            next.kind === "certificate"
              ? await prepareCertificateFile(next.file)
              : await prepareImageFile(next.file);

          if (next.kind === "image") patchImage(next.key, { status: "uploading", progress: 15 });
          else patchCert({ status: "uploading", progress: 15 });

          const filename =
            next.kind === "certificate"
              ? `${session.id}_cert_${Date.now()}${extensionForMime(prepared.type, prepared.name)}`
              : `${session.id}_img_${Date.now()}${extensionForMime(prepared.type, prepared.name)}`;

          const url = await uploadWithProgress(
            session.folderId,
            filename,
            prepared,
            next.kind,
            (pct) => {
              const progress = Math.max(15, pct);
              if (next.kind === "image") patchImage(next.key, { progress });
              else patchCert({ progress });
            },
          );

          if (next.kind === "image") patchImage(next.key, { status: "done", progress: 100, url });
          else patchCert({ status: "done", progress: 100, url });
        } catch (err) {
          const text = err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ";
          if (next.kind === "image") patchImage(next.key, { status: "error", error: text });
          else patchCert({ status: "error", error: text });
        }
      }
    } finally {
      processingRef.current = false;
    }
    const stillWaiting =
      imageItemsRef.current.some((item) => item.status === "queued") ||
      certItemRef.current?.status === "queued";
    if (stillWaiting) queueMicrotask(() => processQueue());
  }

  function enqueueImages(files: File[]) {
    const remaining = MAX_ACTIVITY_IMAGES - imageItemsRef.current.length;
    if (remaining <= 0) {
      setMessage({ type: "err", text: `อัปโหลดรูปภาพกิจกรรมได้ไม่เกิน ${MAX_ACTIVITY_IMAGES} รูป` });
      return;
    }
    const picked = files.slice(0, remaining);
    const items: UploadItem[] = picked.map((file) => ({
      key: newItemKey(),
      kind: "image",
      name: file.name,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      file,
      status: "queued",
      progress: 0,
    }));
    setImageItems((current) => {
      const next = [...current, ...items];
      imageItemsRef.current = next;
      return next;
    });
    queueMicrotask(() => processQueue());
  }

  function enqueueCert(file: File) {
    if (certItemRef.current?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(certItemRef.current.previewUrl);
    }
    const item: UploadItem = {
      key: newItemKey(),
      kind: "certificate",
      name: file.name,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      file,
      status: "queued",
      progress: 0,
    };
    certItemRef.current = item;
    setCertItem(item);
    queueMicrotask(() => processQueue());
  }

  function removeImage(key: string) {
    setImageItems((items) => {
      const target = items.find((item) => item.key === key);
      if (target?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl);
      const next = items.filter((item) => item.key !== key);
      imageItemsRef.current = next;
      return next;
    });
  }

  function removeCert() {
    if (certItemRef.current?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(certItemRef.current.previewUrl);
    }
    certItemRef.current = null;
    setCertItem(null);
  }

  function retryItem(item: UploadItem) {
    if (!item.file) return;
    if (item.kind === "image") patchImage(item.key, { status: "queued", progress: 0, error: undefined });
    else patchCert({ status: "queued", progress: 0, error: undefined });
    queueMicrotask(() => processQueue());
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (uploading) {
      setMessage({ type: "err", text: "กรุณารอให้อัปโหลดรูปให้เสร็จก่อนบันทึก" });
      return;
    }
    if (failedCount > 0) {
      setMessage({ type: "err", text: "มีไฟล์อัปโหลดไม่สำเร็จ กรุณาลบหรือลองใหม่อีกครั้ง" });
      return;
    }
    if (!initial && doneImages.length < 3) {
      setMessage({ type: "err", text: "กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 3 รูป" });
      return;
    }
    if (doneImages.length > MAX_ACTIVITY_IMAGES) {
      setMessage({ type: "err", text: `อัปโหลดรูปภาพกิจกรรมได้ไม่เกิน ${MAX_ACTIVITY_IMAGES} รูป` });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const recordId = sessionRef.current?.id || initial?.id;
      const imageUrls = doneImages.map((item) => item.url).filter(Boolean) as string[];
      const certUrl = certItem?.status === "done" ? certItem.url || "" : "";

      if (!initial && imageUrls.length < 3) {
        throw new Error("กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 3 รูป");
      }

      setMessage({ type: "ok", text: "กำลังบันทึกข้อมูล..." });

      const payload = {
        id: recordId,
        folderId: sessionRef.current?.folderId,
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
        imageItems.forEach((item) => {
          if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
        });
        if (certItem?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(certItem.previewUrl);
        setImageItems([]);
        setCertItem(null);
        sessionRef.current = null;
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
        <div className="p-4 border border-dashed border-emerald-300 bg-emerald-50/30 rounded-lg space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            ภาพกิจกรรม (บังคับ 3-5 รูป) {!initial ? <span className="text-red-500">*</span> : null}
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="w-full text-sm"
            disabled={imageItems.length >= MAX_ACTIVITY_IMAGES}
            onChange={(e) => {
              enqueueImages(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
          <span className="text-xs text-slate-400 block">
            เลือกรูปแล้วระบบจะอัปโหลดเข้าคิวทีละรูปทันที สามารถลบรูปที่ไม่ต้องการได้ก่อนกดบันทึก
            {initial ? " — แก้ไขไม่บังคับแนบรูปใหม่" : ""}
          </span>
          <div className="space-y-2">
            {imageItems.map((item, index) => (
              <UploadCard
                key={item.key}
                item={item}
                label={`รูปที่ ${index + 1}`}
                onRemove={() => removeImage(item.key)}
                onRetry={() => retryItem(item)}
              />
            ))}
          </div>
        </div>
        <div className="p-4 border border-dashed border-slate-300 bg-slate-50/50 rounded-lg space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            ไฟล์เกียรติบัตร (ถ้ามี)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) enqueueCert(file);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-slate-400 block">
            รองรับไฟล์รูปหรือ PDF ไม่เกิน 3.5MB · อัปโหลดทันทีเมื่อเลือกไฟล์
          </span>
          {certItem ? (
            <UploadCard
              item={certItem}
              label="เกียรติบัตร"
              onRemove={removeCert}
              onRetry={() => retryItem(certItem)}
            />
          ) : null}
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          type="submit"
          disabled={busy || uploading}
          className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-lg shadow-md transition"
        >
          {busy
            ? "กำลังบันทึก..."
            : uploading
              ? "กำลังอัปโหลดรูป..."
              : initial
                ? "บันทึกการแก้ไข"
                : "บันทึกข้อมูลขึ้นระบบ"}
        </button>
        {uploading ? (
          <p className="text-xs text-slate-400 mt-2">รอให้อัปโหลดทีละรูปให้ครบก่อน จึงจะบันทึกได้</p>
        ) : null}
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

async function uploadWithProgress(
  folderId: string,
  filename: string,
  file: File,
  kind: "image" | "certificate",
  onProgress: (percent: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string; message?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          resolve(data.url);
          return;
        }
        reject(new Error(data.message || "อัปโหลดรูปไม่สำเร็จ"));
      } catch {
        reject(new Error("อัปโหลดรูปไม่สำเร็จ"));
      }
    };
    xhr.onerror = () => reject(new Error("เครือข่ายขัดข้อง กรุณาลองใหม่"));
    const body = new FormData();
    body.append("folderId", folderId);
    body.append("filename", filename);
    body.append("kind", kind);
    body.append("file", file);
    xhr.send(body);
  });
}

function statusLabel(item: UploadItem) {
  if (item.status === "queued") return "รอคิว";
  if (item.status === "preparing") return "กำลังย่อรูป";
  if (item.status === "uploading") return `กำลังอัปโหลด ${item.progress}%`;
  if (item.status === "done") return "อัปโหลดแล้ว";
  return item.error || "อัปโหลดไม่สำเร็จ";
}

function UploadCard({
  item,
  label,
  onRemove,
  onRetry,
}: {
  item: UploadItem;
  label: string;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const barColor =
    item.status === "error"
      ? "bg-rose-500"
      : item.status === "done"
        ? "bg-emerald-600"
        : "bg-sky-500";

  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {item.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-500">
            PDF
          </div>
        )}
      </div>
      <div className="min-w-0 flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-700">{label}</div>
            <div className="truncate text-[11px] text-slate-400">{item.name}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            {item.status === "error" && item.file ? (
              <button type="button" onClick={onRetry} className="text-[11px] font-semibold text-sky-700">
                ลองใหม่
              </button>
            ) : null}
            <button type="button" onClick={onRemove} className="text-[11px] font-semibold text-rose-600">
              ลบ
            </button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${barColor}`} style={{ width: `${item.status === "queued" ? 6 : item.progress}%` }} />
        </div>
        <div
          className={`mt-1 text-[11px] font-medium ${
            item.status === "error"
              ? "text-rose-600"
              : item.status === "done"
                ? "text-emerald-700"
                : "text-slate-500"
          }`}
        >
          {statusLabel(item)}
        </div>
      </div>
    </div>
  );
}

function toInputDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}
