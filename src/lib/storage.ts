/**
 * Penyimpanan berkas privat (NFR-06, arsitektur.md §6.3).
 * - Berkas disimpan di UPLOAD_DIR (default ./storage/uploads), DI LUAR folder public/,
 *   sehingga hanya dapat diunduh melalui route handler yang memeriksa hak akses.
 * - Nama berkas diacak dengan UUIDv4 → mencegah path traversal & overwrite.
 * - Validasi ganda: ekstensi/MIME dan magic bytes (PDF "%PDF-", PNG, JPEG).
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_PDF_BYTES = Number(process.env.MAX_FILE_SIZE_MB ?? 5) * 1024 * 1024;

const ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./storage/uploads");
const KEY_PATTERN = /^[a-z-]+\/[0-9a-f-]{36}\.(pdf|png|jpg)$/;

export class UploadError extends Error {}

/** Validasi berkas PDF dari FormData; melempar UploadError dengan pesan ramah pengguna. */
export async function readPdfUpload(value: FormDataEntryValue | null, label = "Berkas"): Promise<Buffer> {
  if (!(value instanceof File) || value.size === 0) throw new UploadError(`${label} (.PDF) wajib diunggah.`);
  if (value.size > MAX_PDF_BYTES) {
    throw new UploadError(`${label} melebihi batas ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB.`);
  }
  if (!value.name.toLowerCase().endsWith(".pdf") || (value.type && value.type !== "application/pdf")) {
    throw new UploadError(`${label} harus berformat .PDF.`);
  }
  const bytes = Buffer.from(await value.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new UploadError(`${label} bukan dokumen PDF yang valid.`);
  }
  return bytes;
}

export type StorageCategory = "proposals" | "reports" | "outputs" | "logbooks";
export type StoredExt = "pdf" | "png" | "jpg";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // NFR-06: 2 MB untuk gambar/bukti logbook

export const CONTENT_TYPES: Record<StoredExt, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

/** Deteksi jenis berkas dari magic bytes (bukan dari nama/ekstensi yang bisa dipalsukan). */
function sniff(bytes: Buffer): StoredExt | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

/**
 * Validasi berkas bukti logbook: JPG/PNG (maks 2 MB) atau PDF (maks 5 MB).
 * Mengembalikan null bila tidak ada berkas yang dipilih (bukti bersifat opsional per-field).
 */
export async function readEvidenceUpload(
  value: FormDataEntryValue | null,
  label = "Berkas bukti",
): Promise<{ bytes: Buffer; ext: StoredExt } | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_PDF_BYTES) throw new UploadError(`${label} melebihi batas 5 MB.`);
  const name = value.name.toLowerCase();
  if (!/\.(pdf|png|jpe?g)$/.test(name)) throw new UploadError(`${label} harus berformat JPG, PNG, atau PDF.`);
  const bytes = Buffer.from(await value.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) throw new UploadError(`${label} bukan gambar JPG/PNG atau PDF yang valid.`);
  if (ext !== "pdf" && bytes.length > MAX_IMAGE_BYTES) throw new UploadError(`Gambar ${label.toLowerCase()} melebihi batas 2 MB.`);
  return { bytes, ext };
}

/** Simpan berkas ke folder kategori, kembalikan storage key (mis. "logbooks/<uuid>.png"). */
export async function saveUpload(category: StorageCategory, bytes: Buffer, ext: StoredExt): Promise<string> {
  const key = `${category}/${randomUUID()}.${ext}`;
  const target = path.join(ROOT, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return key;
}

/** Simpan PDF ke folder kategori, kembalikan storage key (mis. "proposals/<uuid>.pdf"). */
export async function savePdf(category: StorageCategory, bytes: Buffer): Promise<string> {
  return saveUpload(category, bytes, "pdf");
}

export function extOfKey(key: string): StoredExt | null {
  const m = key.match(/\.(pdf|png|jpg)$/);
  return m ? (m[1] as StoredExt) : null;
}

function resolveKey(key: string): string | null {
  if (!KEY_PATTERN.test(key)) return null;
  const target = path.join(ROOT, key);
  return target.startsWith(ROOT + path.sep) ? target : null;
}

/** Baca berkas berdasarkan storage key; null bila key tidak valid atau berkas tidak ada. */
export async function readStoredFile(key: string): Promise<Buffer | null> {
  const target = resolveKey(key);
  if (!target) return null;
  try {
    return await readFile(target);
  } catch {
    return null;
  }
}

/** Hapus berkas (mis. berkas yatim saat penyimpanan data gagal). Mengabaikan error. */
export async function deleteStoredFile(key: string): Promise<void> {
  const target = resolveKey(key);
  if (target) await unlink(target).catch(() => {});
}
