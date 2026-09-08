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
  imageUrls?: string[];
  certUrl?: string;
  folderId?: string;
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
  "กระบี่",
  "กรุงเทพมหานคร",
  "กาญจนบุรี",
  "กาฬสินธุ์",
  "กำแพงเพชร",
  "ขอนแก่น",
  "จันทบุรี",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ชัยนาท",
  "ชัยภูมิ",
  "ชุมพร",
  "เชียงราย",
  "เชียงใหม่",
  "ตรัง",
  "ตราด",
  "ตาก",
  "นครนายก",
  "นครปฐม",
  "นครพนม",
  "นครราชสีมา",
  "นครศรีธรรมราช",
  "นครสวรรค์",
  "นนทบุรี",
  "นราธิวาส",
  "น่าน",
  "บึงกาฬ",
  "บุรีรัมย์",
  "ปทุมธานี",
  "ประจวบคีรีขันธ์",
  "ปราจีนบุรี",
  "ปัตตานี",
  "พระนครศรีอยุธยา",
  "พะเยา",
  "พังงา",
  "พัทลุง",
  "พิจิตร",
  "พิษณุโลก",
  "เพชรบุรี",
  "เพชรบูรณ์",
  "แพร่",
  "ภูเก็ต",
  "มหาสารคาม",
  "แม่ฮ่องสอน",
  "ยโสธร",
  "ยะลา",
  "ร้อยเอ็ด",
  "ระนอง",
  "ระยอง",
  "ราชบุรี",
  "ลพบุรี",
  "ลำปาง",
  "ลำพูน",
  "เลย",
  "ศรีสะเกษ",
  "สกลนคร",
  "สงขลา",
  "สตูล",
  "สมุทรปราการ",
  "สมุทรสงคราม",
  "สมุทรสาคร",
  "สระแก้ว",
  "สระบุรี",
  "สิงห์บุรี",
  "สุโขทัย",
  "สุพรรณบุรี",
  "สุราษฎร์ธานี",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อ่างทอง",
  "อำนาจเจริญ",
  "อุดรธานี",
  "อุตรดิตถ์",
  "อุทัยธานี",
  "อุบลราชธานี",
];
