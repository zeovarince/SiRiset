/**
 * Utilitas autentikasi & sesi SiRiset (server-side, Node runtime).
 *
 * - Sesi disimpan di cookie HttpOnly terenkripsi AES-256-GCM (lihat ./session.ts).
 * - Cookie hanya memuat { uid, role aktif, iat, exp }; data pengguna & daftar peran
 *   selalu dibaca ulang dari basis data agar perubahan peran langsung berlaku.
 * - Role Switcher: pengguna berganti peran aktif di antara peran yang ia miliki;
 *   di Mode Demo (DEMO_MODE="true") juga dapat masuk sebagai akun representatif tiap peran.
 */
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ROLE_CODES, type Role } from "./roles";
import { SESSION_COOKIE, decryptSession, encryptSession, sessionCookieOptions } from "./session";

export type CurrentUser = {
  id: string;
  nimNip: string;
  fullName: string;
  email: string;
  roles: Role[];
  activeRole: Role;
};

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** Urutkan peran sesuai ROLE_CODES agar peran default konsisten. */
function sortRoles(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => ROLE_CODES.indexOf(a) - ROLE_CODES.indexOf(b));
}

export async function getSession() {
  const store = await cookies();
  return decryptSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Pengguna yang sedang login beserta peran aktifnya. Di-cache per request.
 * Mengembalikan null bila sesi tidak valid, akun nonaktif, atau peran aktif sudah dicabut.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { roles: true },
  });
  if (!user || !user.isActive) return null;

  const roles = sortRoles(user.roles.map((r) => r.roleCode as Role));
  if (!roles.includes(session.role)) return null;

  return {
    id: user.id,
    nimNip: user.nimNip,
    fullName: user.fullName,
    email: user.email,
    roles,
    activeRole: session.role,
  };
});

/** Wajibkan login; arahkan ke /login bila belum. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Wajibkan peran aktif tertentu (ADMIN selalu lolos). */
export async function requireRole(...allowed: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.activeRole !== "ADMIN" && !allowed.includes(user.activeRole)) {
    redirect("/dashboard?denied=1");
  }
  return user;
}

let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hash("siriset-dummy-password", 10);
  return dummyHash;
}

/** Verifikasi kredensial NIM/NIP + password. */
export async function authenticate(nimNip: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { nimNip },
    include: { roles: true },
  });
  // Tetap jalankan bcrypt meski user tidak ada agar waktu respons seragam (mencegah enumerasi NIM/NIP).
  const hash = user?.passwordHash ?? (await getDummyHash());
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid || !user.isActive) return null;
  return { id: user.id, roles: sortRoles(user.roles.map((r) => r.roleCode as Role)) };
}

export async function createSession(uid: string, role: Role) {
  const token = await encryptSession({ uid, role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Catat aksi ke tabel audit_logs (append-only). Kegagalan audit tidak menggagalkan aksi utama. */
export async function recordAudit(params: {
  userId: string | null;
  action: string;
  entityName: string;
  entityId: string;
  payload?: unknown;
}) {
  try {
    const h = await headers();
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        actionName: params.action,
        entityName: params.entityName,
        entityId: params.entityId,
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
        userAgent: h.get("user-agent"),
        payloadJson: params.payload === undefined ? null : JSON.stringify(params.payload),
      },
    });
  } catch (err) {
    console.error("[audit] gagal mencatat audit log:", err);
  }
}
