import type {
  AwardRecord,
  SaveAwardInput,
  SettingItem,
  Student,
  SystemSettings,
  Teacher,
} from "./types";

const defaultSettings: SystemSettings = {
  AcademicYear: ["2566", "2567", "2568"],
  Term: ["1", "2"],
  LearningArea: [
    "วิทยาศาสตร์และเทคโนโลยี",
    "คณิตศาสตร์",
    "ภาษาไทย",
    "ภาษาต่างประเทศ",
    "ศิลปะ",
    "สุขศึกษาและพลศึกษา",
    "สังคมศึกษา ศาสนา และวัฒนธรรม",
    "การงานอาชีพ",
  ],
  Level: ["ระดับเขตพื้นที่", "ระดับจังหวัด", "ระดับภาค", "ระดับชาติ", "ระดับนานาชาติ"],
  AwardLevel: ["เหรียญทอง", "เหรียญเงิน", "เหรียญทองแดง", "เข้าร่วม"],
  AwardType: ["ชนะเลิศ", "รองชนะเลิศอันดับ 1", "รองชนะเลิศอันดับ 2", "ไม่มีอันดับ"],
  HighStatsLevels: ["ระดับชาติ", "ระดับนานาชาติ"],
};

let settings: SystemSettings = structuredClone(defaultSettings);

let records: AwardRecord[] = [
  {
    id: "REC_DEMO_1",
    timestamp: new Date().toISOString(),
    academicYear: "2568",
    term: "1",
    learningArea: "คณิตศาสตร์",
    activityName: "การแข่งขันคณิตคิดเร็ว ระดับจังหวัด",
    level: "ระดับจังหวัด",
    startDate: "2025-08-15",
    endDate: "2025-08-15",
    location: "ศาลากลางจังหวัดมุกดาหาร",
    province: "มุกดาหาร",
    students: [
      { name: "เด็กชายสมชาย ดีใจ (ม.1/1)", level: "เหรียญทอง", type: "ชนะเลิศ" },
      { name: "เด็กหญิงสมศรี แก้วกล้า (ม.1/1)", level: "เหรียญเงิน", type: "รองชนะเลิศอันดับ 1" },
    ],
    teachers: ["นายสมศักดิ์ รักสอน (วิทยาศาสตร์และเทคโนโลยี)"],
    imageUrls: [
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80",
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80",
    ],
    certUrl: "",
  },
  {
    id: "REC_DEMO_2",
    timestamp: new Date().toISOString(),
    academicYear: "2568",
    term: "1",
    learningArea: "วิทยาศาสตร์และเทคโนโลยี",
    activityName: "โครงงานวิทยาศาสตร์ ระดับชาติ",
    level: "ระดับชาติ",
    startDate: "2025-09-01",
    endDate: "2025-09-03",
    location: "ศูนย์ประชุมแห่งชาติสิริกิติ์",
    province: "กรุงเทพมหานคร",
    students: [
      { name: "นายดอนตาล รักเรียน (ม.4/1)", level: "เหรียญทอง", type: "ชนะเลิศ" },
    ],
    teachers: ["นางจันทร์เพ็ญ เรียนดี (คณิตศาสตร์)"],
    imageUrls: [
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
      "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80",
    ],
    certUrl: "",
  },
];

const students: Student[] = [
  { studentId: "65001", prefix: "เด็กชาย", fullName: "สมชาย ดีใจ", className: "ม.1/1" },
  { studentId: "65002", prefix: "เด็กหญิง", fullName: "สมศรี แก้วกล้า", className: "ม.1/1" },
  { studentId: "65003", prefix: "นาย", fullName: "ดอนตาล รักเรียน", className: "ม.4/1" },
  { studentId: "65004", prefix: "นางสาว", fullName: "วิทยา พัฒนา", className: "ม.5/2" },
];

const teachers: Teacher[] = [
  { teacherId: "T001", prefix: "นาย", fullName: "สมศักดิ์ รักสอน", learningArea: "วิทยาศาสตร์และเทคโนโลยี" },
  { teacherId: "T002", prefix: "นาง", fullName: "จันทร์เพ็ญ เรียนดี", learningArea: "คณิตศาสตร์" },
  { teacherId: "T003", prefix: "นางสาว", fullName: "อรทัย ใฝ่รู้", learningArea: "ภาษาไทย" },
  { teacherId: "T004", prefix: "นาย", fullName: "ไพโรจน์ ชำนาญงาน", learningArea: "การงานอาชีพ" },
];

export const mockStore = {
  getRecords(): AwardRecord[] {
    return [...records];
  },

  getSettings(): SystemSettings {
    return structuredClone(settings);
  },

  getStudents(): Student[] {
    return [...students];
  },

  getTeachers(): Teacher[] {
    return [...teachers];
  },

  authenticate(username: string, password: string) {
    if (username === "admin" && password === "dtw12345") {
      return { username: "admin", fullName: "ผู้ดูแลระบบ ดอนตาลวิทยา" };
    }
    return null;
  },

  async saveRecord(input: SaveAwardInput): Promise<AwardRecord> {
    const isUpdate = Boolean(input.id);
    const id = input.id || `REC${Date.now()}`;
    const existing = records.find((r) => r.id === id);

    const imageUrls =
      input.images && input.images.length > 0
        ? input.images.map(
            (_, i) =>
              `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&mock=${id}-${i}`,
          )
        : existing?.imageUrls || [];

    const certUrl =
      input.certificate?.base64
        ? `https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=800&q=80&cert=${id}`
        : existing?.certUrl || "";

    const row: AwardRecord = {
      id,
      timestamp: existing?.timestamp || new Date().toISOString(),
      academicYear: input.academicYear,
      term: input.term,
      learningArea: input.learningArea,
      activityName: input.activityName,
      level: input.level,
      startDate: input.startDate,
      endDate: input.endDate,
      location: input.location,
      province: input.province,
      students: input.students,
      teachers: input.teachers,
      imageUrls,
      certUrl,
    };

    if (isUpdate) {
      records = records.map((r) => (r.id === id ? row : r));
    } else {
      records = [row, ...records];
    }
    return row;
  },

  deleteRecord(id: string) {
    const before = records.length;
    records = records.filter((r) => r.id !== id);
    return before !== records.length;
  },

  updateSettings(items: SettingItem[]) {
    const next: SystemSettings = {
      AcademicYear: [],
      Term: [],
      LearningArea: [],
      Level: [],
      AwardLevel: [],
      AwardType: [],
      HighStatsLevels: [],
    };
    for (const item of items) {
      if (next[item.type]) next[item.type].push(item.value);
    }
    settings = next;
  },
};
