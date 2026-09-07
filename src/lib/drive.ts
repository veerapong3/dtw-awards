import { Readable } from "stream";
import { getDriveClient, getDriveFolderId } from "./google";

export function explainDriveUploadError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("storage quota") ||
    msg.includes("Service Accounts do not have") ||
    msg.includes("shared drives")
  ) {
    return (
      "อัปโหลดรูปไม่ได้: Service Account ไม่มีพื้นที่ Drive — " +
      "รัน npm run setup:oauth-drive เพื่อ authorize บัญชีครู (ไม่ต้อง Admin) " +
      "หรือดู SETUP-TH.md"
    );
  }
  return msg;
}

function cleanName(name: string) {
  return name.replace(/[/\\:*?"<>|]/g, "_");
}

function folderName(startDate: string, activityName: string) {
  return `${startDate} - ${cleanName(activityName)}`;
}

/** Normalize sheet/Drive date strings to YYYY-MM-DD for folder lookup. */
export function normalizeDateForFolder(date: string | number): string {
  if (typeof date === "number" && Number.isFinite(date)) {
    const ms = (date - 25569) * 86400 * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }

  const value = String(date).trim();
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const thaiSlash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (thaiSlash) {
    let year = Number(thaiSlash[3]);
    if (year > 2400) year -= 543;
    return `${year}-${String(thaiSlash[2]).padStart(2, "0")}-${String(thaiSlash[1]).padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return value;
}

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([^/?#]+)/) || url.match(/[?&]id=([^&]+)/);
  return match?.[1] || null;
}

async function getFileParentId(fileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: "parents",
    supportsAllDrives: true,
  });
  return res.data.parents?.[0] || null;
}

async function findFolderByActivityName(parentId: string, activityName: string) {
  const suffix = ` - ${cleanName(activityName)}`;
  const drive = getDriveClient();
  let pageToken: string | undefined;

  do {
    const foldersRes = await drive.files.list({
      q: [
        `'${parentId}' in parents`,
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
      ].join(" and "),
      fields: "nextPageToken, files(id, name)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const matches = (foldersRes.data.files || []).filter((folder) =>
      folder.name?.endsWith(suffix),
    );
    if (matches.length === 1 && matches[0].id) return matches[0].id;

    pageToken = foldersRes.data.nextPageToken || undefined;
  } while (pageToken);

  return null;
}

async function findFolderByRecordFiles(parentId: string, recordId: string) {
  const drive = getDriveClient();
  let pageToken: string | undefined;

  do {
    const foldersRes = await drive.files.list({
      q: [
        `'${parentId}' in parents`,
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
      ].join(" and "),
      fields: "nextPageToken, files(id)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const folder of foldersRes.data.files || []) {
      if (!folder.id) continue;
      const filesRes = await drive.files.list({
        q: [
          `'${folder.id}' in parents`,
          `name contains '${recordId.replace(/'/g, "\\'")}'`,
          "trashed = false",
        ].join(" and "),
        fields: "files(id, name)",
        pageSize: 5,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const hasRecordFile = (filesRes.data.files || []).some(
        (file) => file.name?.startsWith(`${recordId}_`),
      );
      if (hasRecordFile) return folder.id;
    }

    pageToken = foldersRes.data.nextPageToken || undefined;
  } while (pageToken);

  return null;
}

async function findChildFolder(parentId: string, name: string) {
  const drive = getDriveClient();
  const q = [
    `'${parentId}' in parents`,
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return res.data.files?.[0]?.id || null;
}

export async function getOrCreateEventFolder(
  startDate: string,
  activityName: string,
  existingFolderId?: string | null,
) {
  const drive = getDriveClient();
  const parentId = getDriveFolderId();
  const name = folderName(startDate, activityName);

  if (existingFolderId) {
    await drive.files.update({
      fileId: existingFolderId,
      requestBody: { name },
      supportsAllDrives: true,
    });
    return existingFolderId;
  }

  const found = await findChildFolder(parentId, name);
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) throw new Error("สร้างโฟลเดอร์กิจกรรมไม่สำเร็จ");
  return created.data.id;
}

export async function findEventFolder(startDate: string, activityName: string) {
  const parentId = getDriveFolderId();
  const dateVariants = [...new Set([startDate, normalizeDateForFolder(startDate)])];

  for (const date of dateVariants) {
    const found = await findChildFolder(parentId, folderName(date, activityName));
    if (found) return found;
  }

  return null;
}

type EventFolderRecord = {
  id: string;
  startDate: string;
  activityName: string;
  imageUrls: string[];
  certUrl: string;
};

export async function findEventFolderForRecord(record: EventFolderRecord) {
  const parentId = getDriveFolderId();
  const byName = await findEventFolder(record.startDate, record.activityName);
  if (byName) return byName;

  for (const url of [...record.imageUrls, record.certUrl]) {
    const fileId = extractDriveFileId(url);
    if (!fileId) continue;
    const folderId = await getFileParentId(fileId);
    if (folderId && folderId !== parentId) return folderId;
  }

  return (
    (await findFolderByRecordFiles(parentId, record.id)) ||
    (await findFolderByActivityName(parentId, record.activityName))
  );
}

export async function deleteEventFolderForRecord(record: EventFolderRecord) {
  const folderId = await findEventFolderForRecord(record);
  if (!folderId) return;

  await trashFilesByPrefix(folderId, `${record.id}_`);
  await trashFolder(folderId);
}

export async function trashFolder(folderId: string) {
  const drive = getDriveClient();
  await drive.files.update({
    fileId: folderId,
    requestBody: { trashed: true },
    supportsAllDrives: true,
  });
}

export async function trashFilesByPrefix(folderId: string, prefix: string) {
  const drive = getDriveClient();
  const q = [
    `'${folderId}' in parents`,
    `name contains '${prefix.replace(/'/g, "\\'")}'`,
    "trashed = false",
  ].join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  for (const file of res.data.files || []) {
    if (!file.id || !file.name?.startsWith(prefix)) continue;
    await drive.files.update({
      fileId: file.id,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  }
}

function parseBase64(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("รูปแบบไฟล์รูปภาพไม่ถูกต้อง");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function uploadBufferToDrive(
  folderId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
) {
  const drive = getDriveClient();

  try {
    const created = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id",
      supportsAllDrives: true,
    });

    const fileId = created.data.id;
    if (!fileId) throw new Error("อัปโหลดรูปไม่สำเร็จ");

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });

    if (mimeType === "application/pdf") {
      return `https://drive.google.com/file/d/${fileId}/view`;
    }
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  } catch (error) {
    throw new Error(explainDriveUploadError(error));
  }
}

export async function uploadImageToDrive(
  folderId: string,
  filename: string,
  base64Data: string,
) {
  const { mimeType, buffer } = parseBase64(base64Data);
  return uploadBufferToDrive(folderId, filename, buffer, mimeType);
}

export async function trashFilesByUrls(urls: string[]) {
  const drive = getDriveClient();
  for (const url of urls) {
    const fileId = extractDriveFileId(url);
    if (!fileId) continue;
    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  }
}
