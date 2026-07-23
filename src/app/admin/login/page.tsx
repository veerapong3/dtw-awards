"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md border border-slate-100 p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-1 text-center">เข้าสู่ระบบผู้ดูแล</h1>
      <p className="text-sm text-slate-500 mb-6 text-center">
        ใช้สำหรับแก้ไข ลบ และตั้งค่าระบบเท่านั้น
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>
        ) : null}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">ชื่อผู้ใช้งาน</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg p-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg p-2.5"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-lg"
        >
          {busy ? "กำลังตรวจสอบ..." : "ยืนยันตัวตน"}
        </button>
      </form>
    </div>
  );
}
