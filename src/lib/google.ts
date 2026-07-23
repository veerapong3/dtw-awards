import { google } from "googleapis";

export function isMockMode() {
  if (process.env.USE_MOCK === "true") return true;
  return !process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
}

const SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

function getServiceAccountCreds() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY");
  }

  return { email, key };
}

function getJwtAuth(scopes: string[], subject?: string) {
  const { email, key } = getServiceAccountCreds();
  return new google.auth.JWT({
    email,
    key,
    scopes,
    ...(subject ? { subject } : {}),
  });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getJwtAuth(SHEETS_SCOPES) });
}

/**
 * Drive auth priority:
 * 1. OAuth refresh token (ไม่ต้อง Admin — ใช้ quota ของครูที่ authorize)
 * 2. Service Account + impersonate (ต้อง Domain-wide delegation)
 * 3. Service Account ตรง (ใช้ได้เฉพาะ Shared Drive)
 */
export function getDriveAuth() {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (refreshToken && clientId && clientSecret) {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  const impersonate = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL?.trim();
  return getJwtAuth(DRIVE_SCOPES, impersonate || undefined);
}

export function usesOAuthDrive() {
  return Boolean(
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
  );
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getDriveAuth() });
}

export function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("ยังไม่ได้ตั้งค่า GOOGLE_SHEET_ID");
  return id;
}

export function getDriveFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("ยังไม่ได้ตั้งค่า GOOGLE_DRIVE_FOLDER_ID");
  return id;
}
