export type StudentAward = {
  name: string;
  level: string;
  type: string;
};

export type AwardRecord = {
  id: string;
  timestamp: string;
  academicYear: string;
  term: string;
  learningArea: string;
  activityName: string;
  level: string;
  startDate: string;
  endDate: string;
  location: string;
  province: string;
  students: StudentAward[];
  teachers: string[];
  imageUrls: string[];
  certUrl: string;
};

export type SystemSettings = {
  AcademicYear: string[];
  Term: string[];
  LearningArea: string[];
  Level: string[];
  AwardLevel: string[];
  AwardType: string[];
  HighStatsLevels: string[];
};

export type Student = {
  studentId: string;
  prefix: string;
  fullName: string;
  className: string;
};

export type Teacher = {
  teacherId: string;
  prefix: string;
  fullName: string;
  learningArea: string;
};

export type AdminUser = {
  username: string;
  fullName: string;
};

export type SaveAdminUserInput = {
  username: string;
  fullName: string;
  password?: string;
};

export type ImagePayload = {
  base64: string;
  name: string;
};

export type SaveAwardInput = {
  id?: string;
  academicYear: string;
  term: string;
  learningArea: string;
  activityName: string;
  level: string;
  startDate: string;
  endDate: string;
  location: string;
  province: string;
  students: StudentAward[];
  teachers: string[];
  images?: ImagePayload[];
  certificate?: ImagePayload | null;
};

export type SettingItem = {
  type: keyof SystemSettings;
  value: string;
};

export const SHEET_NAMES = {
  RECORDS: "Records",
  SETTINGS: "Settings",
  USERS: "Users",
  STUDENTS: "Students",
  TEACHERS: "Teachers",
} as const;

export const PROVINCES = [
  "มุกดาหาร",
  "กรุงเทพมหานคร",
  "อุบลราชธานี",
  "นครพนม",
  "ขอนแก่น",
  "กาฬสินธุ์",
  "สกลนคร",
  "ร้อยเอ็ด",
  "ยโสธร",
  "อำนาจเจริญ",
];
