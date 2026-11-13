/**
 * Enkripsi token sesi berbasis Web Crypto (AES-256-GCM).
 * Edge-safe: dipakai bersama oleh middleware (Edge runtime) dan server (Node runtime).
 *
 * Format token: base64url(iv) + "." + base64url(ciphertext||tag)
 * AES-GCM memberi kerahasiaan sekaligus integritas — token yang diubah akan gagal didekripsi.
 */
import { isRole, type Role } from "./roles";

export const SESSION_COOKIE = "siriset_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 jam (satu hari kerja)

export type SessionPayload = {
  /** ID pengguna (users.id) */
  uid: string;
  /** Peran aktif yang sedang dipakai (konteks Role Switcher) */
  role: Role;
  /** Issued-at & expiry dalam detik epoch */
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let cachedKey: Promise<CryptoKey> | null = null;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum diset atau kurang dari 32 karakter (lihat .env.example).");
  }
  return secret;
}

function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = crypto.subtle
      .digest("SHA-256", encoder.encode(getSecret()))
      .then((raw) => crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]));
  }
  return cachedKey;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptSession(data: { uid: string; role: Role }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...data, iat: now, exp: now + SESSION_TTL_SECONDS };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getKey(),
    encoder.encode(JSON.stringify(payload)),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [ivPart, dataPart] = token.split(".");
  if (!ivPart || !dataPart) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivPart) },
      await getKey(),
      fromBase64Url(dataPart),
    );
    const payload = JSON.parse(decoder.decode(plain)) as Partial<SessionPayload>;
    if (
      typeof payload.uid !== "string" ||
      !isRole(payload.role) ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null; // token rusak, dipalsukan, atau kunci berganti
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
