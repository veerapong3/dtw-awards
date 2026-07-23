"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/types";

type Props = {
  users: AdminUser[];
  currentUsername: string;
};

type FormState = {
  username: string;
  fullName: string;
  password: string;
};

const emptyForm: FormState = { username: "", fullName: "", password: "" };

export function AdminUsersPanel({ users, currentUsername }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "เพิ่มผู้ใช้ไม่สำเร็จ");
      }
      setCreateForm(emptyForm);
      setMessage({ type: "ok", text: "เพิ่มผู้ดูแลระบบเรียบร้อย" });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : "เพิ่มผู้ใช้ไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(user: AdminUser) {
    setEditing(user.username);
    setEditForm({ username: user.username, fullName: user.fullName, password: "" });
    setMessage(null);
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        username: editing,
        fullName: editForm.fullName,
        ...(editForm.password ? { password: editForm.password } : {}),
      };
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "แก้ไขผู้ใช้ไม่สำเร็จ");
      }
      setEditing(null);
      setEditForm(emptyForm);
      setMessage({ type: "ok", text: "บันทึกการแก้ไขเรียบร้อย" });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : "แก้ไขผู้ใช้ไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(username: string) {
    if (!confirm(`ลบผู้ใช้ "${username}" ใช่หรือไม่?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "ลบผู้ใช้ไม่สำเร็จ");
      }
      if (editing === username) {
        setEditing(null);
        setEditForm(emptyForm);
      }
      setMessage({ type: "ok", text: "ลบผู้ใช้เรียบร้อย" });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : "ลบผู้ใช้ไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {message ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={onCreate} className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-lg font-bold text-slate-700 border-b pb-2">เพิ่มผู้ดูแลระบบ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ชื่อผู้ใช้งาน">
            <input
              value={createForm.username}
              onChange={(e) => setCreateForm((v) => ({ ...v, username: e.target.value }))}
              required
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </Field>
          <Field label="ชื่อ-นามสกุล">
            <input
              value={createForm.fullName}
              onChange={(e) => setCreateForm((v) => ({ ...v, fullName: e.target.value }))}
              required
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </Field>
        </div>
        <Field label="รหัสผ่าน">
          <input
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((v) => ({ ...v, password: e.target.value }))}
            required
            minLength={6}
            className="w-full border border-slate-300 rounded-lg p-2.5"
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg font-medium"
        >
          {busy ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
        </button>
      </form>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">
          รายชื่อผู้ดูแล ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีผู้ดูแลระบบ</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.username}
                className="border border-slate-100 rounded-lg p-4 flex flex-wrap items-start justify-between gap-3"
              >
                {editing === user.username ? (
                  <form onSubmit={onUpdate} className="w-full space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="ชื่อผู้ใช้งาน">
                        <input
                          value={editForm.username}
                          disabled
                          className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                        />
                      </Field>
                      <Field label="ชื่อ-นามสกุล">
                        <input
                          value={editForm.fullName}
                          onChange={(e) =>
                            setEditForm((v) => ({ ...v, fullName: e.target.value }))
                          }
                          required
                          className="w-full border border-slate-300 rounded-lg p-2.5"
                        />
                      </Field>
                    </div>
                    <Field label="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)">
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm((v) => ({ ...v, password: e.target.value }))
                        }
                        minLength={6}
                        className="w-full border border-slate-300 rounded-lg p-2.5"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setEditForm(emptyForm);
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold text-slate-800">{user.fullName}</p>
                      <p className="text-sm text-slate-500">@{user.username}</p>
                      {user.username === currentUsername ? (
                        <span className="inline-block mt-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          บัญชีที่ใช้งานอยู่
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        disabled={busy}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(user.username)}
                        disabled={busy || user.username === currentUsername}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
