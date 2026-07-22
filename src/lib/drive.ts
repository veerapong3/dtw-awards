import { Readable } from "stream";
import { getDriveClient, getDriveFolderId } from "./google";

function cleanName(name: string) {
  return name.replace(/[/\\:*?"<>|]/g, "_");
}

function folderName(startDate: string, activityName: string) {
  return `${startDate} - ${cleanName(activityName)}`;
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
  return findChildFolder(getDriveFolderId(), folderName(startDate, activityName));
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

export async function uploadImageToDrive(
  folderId: string,
  filename: string,
  base64Data: string,
) {
  const drive = getDriveClient();
  const { mimeType, buffer } = parseBase64(base64Data);

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

  return `https://lh3.googleusercontent.com/d/${fileId}`;
}
