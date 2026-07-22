"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import type { AwardRecord } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export function StatsView({ records }: { records: AwardRecord[] }) {
  const areaCounts = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      map[r.learningArea] = (map[r.learningArea] || 0) + 1;
    });
    return map;
  }, [records]);

  const levelCounts = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      map[r.level] = (map[r.level] || 0) + 1;
    });
    return map;
  }, [records]);

  const topStudents = useMemo(() => rankNames(records, "students"), [records]);
  const topTeachers = useMemo(() => rankNames(records, "teachers"), [records]);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <h1 className="text-2xl font-bold text-slate-800">ข้อมูลสถิติผลงานและทักษะความสามารถ</h1>
        <p className="text-sm text-slate-500 mt-1">
          สรุปภาพรวมแผนภูมิทางวิชาการและบุคคลที่มีสถิติผลงานสูงสุด
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            สถิติจำนวนรางวัลแยกตามกลุ่มสาระฯ
          </h2>
          <div className="relative h-64">
            <Bar
              data={{
                labels: Object.keys(areaCounts),
                datasets: [
                  {
                    label: "จำนวนรายการ",
                    data: Object.values(areaCounts),
                    backgroundColor: "rgba(16, 185, 129, 0.7)",
                    borderColor: "rgba(16, 185, 129, 1)",
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
              }}
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            สถิติรางวัลแยกตามระดับการแข่งขัน
          </h2>
          <div className="relative h-64">
            <Pie
              data={{
                labels: Object.keys(levelCounts),
                datasets: [
                  {
                    data: Object.values(levelCounts),
                    backgroundColor: [
                      "rgba(16, 185, 129, 0.7)",
                      "rgba(59, 130, 246, 0.7)",
                      "rgba(245, 158, 11, 0.7)",
                      "rgba(239, 68, 68, 0.7)",
                      "rgba(100, 116, 139, 0.7)",
                    ],
                  },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopTable title="ทำเนียบนักเรียนเข้าร่วมแข่งขันสูงสุด" rows={topStudents} />
        <TopTable title="ทำเนียบครูผู้ฝึกสอน/ควบคุมสูงสุด" rows={topTeachers} />
      </div>
    </div>
  );
}

function rankNames(records: AwardRecord[], kind: "students" | "teachers") {
  const counts: Record<string, number> = {};
  for (const rec of records) {
    if (kind === "students") {
      rec.students?.forEach((s) => {
        if (!s.name) return;
        const name = s.name.trim();
        counts[name] = (counts[name] || 0) + 1;
      });
    } else {
      rec.teachers?.forEach((t) => {
        if (!t) return;
        const name = t.trim();
        counts[name] = (counts[name] || 0) + 1;
      });
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function TopTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; count: number }[];
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">{title}</h2>
      <table className="w-full text-sm text-left text-slate-600">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
          <tr>
            <th className="py-2 px-3 text-center w-16">อันดับ</th>
            <th className="py-2 px-3">ชื่อ - นามสกุล</th>
            <th className="py-2 px-3 text-center w-32">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-4 text-slate-400">
                ยังไม่มีข้อมูล
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.name} className="border-b border-slate-100">
                <td className="py-2.5 px-3 text-center font-bold">{index + 1}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-700">{row.name}</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold bg-emerald-50/50">
                  {row.count} ครั้ง
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
