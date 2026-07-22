import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { AdminUser } from "./types";

export type SessionData = {
  isLoggedIn: boolean;
  user?: AdminUser;
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "dev-only-secret-change-me-32chars!!",
  cookieName: "dtw_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return null;
  }
  return session.user;
}
