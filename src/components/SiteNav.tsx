"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "ผลงานเด่น" },
  { href: "/stats", label: "สถิติ" },
  { href: "/submit", label: "เพิ่มผลงาน" },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) setUser(data.user);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-emerald-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <span className="text-2xl" aria-hidden>
              🎓
            </span>
            <div className="min-w-0">
              <span className="font-bold text-lg block leading-tight truncate">
                โรงเรียนดอนตาลวิทยา
              </span>
              <span className="text-xs text-emerald-200">สพม.มุกดาหาร</span>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    active ? "bg-emerald-900" : "hover:bg-emerald-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {user ? (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname.startsWith("/admin")
                      ? "bg-emerald-900"
                      : "hover:bg-emerald-800 text-emerald-100"
                  }`}
                >
                  จัดการระบบ
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-sm font-medium transition"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
