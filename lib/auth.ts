import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "stha_session";
const SECRET =
  process.env.AUTH_SECRET ?? "stha-dev-secret-change-me-in-production";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 วัน

export type Role = "owner" | "admin" | "worker" | "sales";
export type Status = "pending" | "active" | "suspended";

export interface SessionPayload {
  uid: number;
  role: Role;
  status: Status;
  name: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    return {
      uid: decoded.uid,
      role: decoded.role,
      status: decoded.status,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

// ลำดับสิทธิ์ — admin/owner เข้าถึงทุกอย่าง
export function isAdmin(role: Role): boolean {
  return role === "admin" || role === "owner";
}
