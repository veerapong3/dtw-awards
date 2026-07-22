import { cacheDelete, cacheDeletePrefix, cacheGet, cacheSet } from "./cache";
import {
  findEventFolder,
  getOrCreateEventFolder,
  trashFilesByPrefix,
  trashFolder,
  uploadImageToDrive,
} from "./drive";
import { getSheetId, getSheetsClient, isMockMode } from "./google";
import { mockStore } from "./mock-store";
import type {
  AwardRecord,
  SaveAwardInput,
  SettingItem,
  Student,
  SystemSettings,
  Teacher,
} from "./types";
import { SHEET_NAMES } from "./types";
import bcrypt from "bcryptjs";

function cell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function parseJsonArray<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function mapRecordRow(row: string[]): AwardRecord {
  return {
    id: row[0] || "",
    timestamp: row[1] || "",
    academicYear: row[2] || "",
    term: row[3] || "",
    learningArea: row[4] || "",
    activityName: row[5] || "",
    level: row[6] || "",
    startDate: row[7] || "",
    endDate: row[8] || "",
    location: row[9] || "",
    province: row[10] || "",
    students: parseJsonArray(row[11], []),
    teachers: parseJsonArray(row[12], []),
    imageUrls: row[13] ? row[13].split(",").map((s) => s.trim()).filter(Boolean) : [],
    certUrl: row[14] || "",
  };
}

async function readSheet(range: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range,
  });
  return (res.data.values || []).map((row) => row.map(cell));
}

export async function getRecords(bypassCache = false): Promise<AwardRecord[]> {
  if (isMockMode()) return mockStore.getRecords();

  const cacheKey = "records";
  if (!bypassCache) {
    const cached = cacheGet<AwardRecord[]>(cacheKey);
    if (cached) return cached;
  }

  const rows = await readSheet(`${SHEET_NAMES.RECORDS}!A2:O`);
  const records = rows
    .filter((row) => row[0])
    .map(mapRecordRow)
    .reverse();

  cacheSet(cacheKey, records, 120);
  return records;
}

export async function getRecordById(id: string) {
  const records = await getRecords();
  return records.find((r) => r.id === id) || null;
}

export async function getSettings(bypassCache = false): Promise<SystemSettings> {
  if (isMockMode()) return mockStore.getSettings();

  const cacheKey = "settings";
  if (!bypassCache) {
    const cached = cacheGet<SystemSettings>(cacheKey);
    if (cached) return cached;
  }

  const rows = await readSheet(`${SHEET_NAMES.SETTINGS}!A2:B`);
  const settings: SystemSettings = {
    AcademicYear: [],
    Term: [],
    LearningArea: [],
    Level: [],
    AwardLevel: [],
    AwardType: [],
    HighStatsLevels: [],
  };

  for (const row of rows) {
    const type = row[0] as keyof SystemSettings;
    const value = row[1];
    if (settings[type] && value) settings[type].push(value);
  }

  cacheSet(cacheKey, settings, 300);
  return settings;
}

export async function updateSettings(items: SettingItem[]) {
  if (isMockMode()) {
    mockStore.updateSettings(items);
    return;
  }

  const sheets = getSheetsClient();
  const values = [["SettingType", "Value"], ...items.map((i) => [i.type, i.value])];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSheetId(),
    range: SHEET_NAMES.SETTINGS,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAMES.SETTINGS}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  cacheDelete("settings");
}

export async function getStudents(): Promise<Student[]> {
  if (isMockMode()) return mockStore.getStudents();

  const cached = cacheGet<Student[]>("students");
  if (cached) return cached;

  const rows = await readSheet(`${SHEET_NAMES.STUDENTS}!A2:D`);
  const list = rows
    .filter((r) => r[2])
    .map((r) => ({
      studentId: r[0] || "",
      prefix: r[1] || "",
      fullName: r[2] || "",
      className: r[3] || "",
    }));

  cacheSet("students", list, 300);
  return list;
}

export async function getTeachers(): Promise<Teacher[]> {
  if (isMockMode()) return mockStore.getTeachers();

  const cached = cacheGet<Teacher[]>("teachers");
  if (cached) return cached;

  const rows = await readSheet(`${SHEET_NAMES.TEACHERS}!A2:D`);
  const list = rows
    .filter((r) => r[2])
    .map((r) => ({
      teacherId: r[0] || "",
      prefix: r[1] || "",
      fullName: r[2] || "",
      learningArea: r[3] || "",
    }));

  cacheSet("teachers", list, 300);
  return list;
}

export async function authenticateUser(username: string, password: string) {
  if (isMockMode()) return mockStore.authenticate(username, password);

  const rows = await readSheet(`${SHEET_NAMES.USERS}!A2:C`);
  for (const row of rows) {
    if (row[0] !== username) continue;
    const stored = row[1] || "";
    const ok = stored.startsWith("$2")
      ? await bcrypt.compare(password, stored)
      : stored === password;
    if (ok) {
      return { username: row[0], fullName: row[2] || username };
    }
  }
  return null;
}

async function findRecordRow(id: string) {
  const rows = await readSheet(`${SHEET_NAMES.RECORDS}!A2:O`);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) {
      return { rowNumber: i + 2, row: rows[i], record: mapRecordRow(rows[i]) };
    }
  }
  return null;
}

export async function saveRecord(input: SaveAwardInput) {
  if (isMockMode()) return mockStore.saveRecord(input);

  const sheets = getSheetsClient();
  const isUpdate = Boolean(input.id);
  let id = input.id || `REC${Date.now()}`;
  let existing: AwardRecord | null = null;
  let rowNumber: number | null = null;

  if (isUpdate && input.id) {
    const found = await findRecordRow(input.id);
    if (!found) throw new Error("ไม่พบรายการที่ต้องการแก้ไข");
    existing = found.record;
    rowNumber = found.rowNumber;
    id = input.id;
  }

  let folderId: string | null = null;
  if (existing) {
    folderId = await findEventFolder(existing.startDate, existing.activityName);
  }
  folderId = await getOrCreateEventFolder(input.startDate, input.activityName, folderId);

  let imageUrls = existing?.imageUrls || [];
  if (input.images && input.images.length > 0) {
    await trashFilesByPrefix(folderId, `${id}_img_`);
    imageUrls = [];
    for (let i = 0; i < input.images.length; i++) {
      const img = input.images[i];
      const filename = `${id}_img_${i}_${Date.now()}.jpg`;
      const url = await uploadImageToDrive(folderId, filename, img.base64);
      imageUrls.push(url);
    }
  }

  let certUrl = existing?.certUrl || "";
  if (input.certificate?.base64) {
    await trashFilesByPrefix(folderId, `${id}_cert`);
    const filename = `${id}_cert_${Date.now()}.jpg`;
    certUrl = await uploadImageToDrive(folderId, filename, input.certificate.base64);
  }

  if (!isUpdate && imageUrls.length < 3) {
    throw new Error("กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 3 รูป");
  }

  const rowData = [
    id,
    existing?.timestamp || new Date().toISOString(),
    input.academicYear,
    input.term,
    input.learningArea,
    input.activityName,
    input.level,
    input.startDate,
    input.endDate,
    input.location,
    input.province,
    JSON.stringify(input.students),
    JSON.stringify(input.teachers),
    imageUrls.join(","),
    certUrl,
  ];

  if (isUpdate && rowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${SHEET_NAMES.RECORDS}!A${rowNumber}:O${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSheetId(),
      range: `${SHEET_NAMES.RECORDS}!A:O`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowData] },
    });
  }

  cacheDeletePrefix("records");
  return mapRecordRow(rowData.map(String));
}

export async function deleteRecord(id: string) {
  if (isMockMode()) return mockStore.deleteRecord(id);

  const sheets = getSheetsClient();
  const found = await findRecordRow(id);
  if (!found) return false;

  const folderId = await findEventFolder(found.record.startDate, found.record.activityName);
  if (folderId) await trashFolder(folderId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: await getSheetGid(SHEET_NAMES.RECORDS),
              dimension: "ROWS",
              startIndex: found.rowNumber - 1,
              endIndex: found.rowNumber,
            },
          },
        },
      ],
    },
  });

  cacheDeletePrefix("records");
  return true;
}

async function getSheetGid(title: string) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties",
  });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === title);
  if (sheet?.properties?.sheetId == null) {
    throw new Error(`ไม่พบชีต ${title}`);
  }
  return sheet.properties.sheetId;
}
