/**
 * Lembar Pengesahan Digital & Stempel QR (bpmn-tobe §4.3: "Dokumen Diberi QR-Code Stempel Digital").
 *
 * Integritas: kode verifikasi = HMAC-SHA256 atas data kanonik dokumen (identitas mahasiswa,
 * rencana riset, paket konversi, hash SHA-256 berkas proposal, dan ketiga keputusan approval).
 * Halaman publik /verify/:id menghitung ulang HMAC dari data terkini — bila ada data yang
 * diubah setelah pengesahan (judul, berkas, approver, waktu), kode tidak lagi cocok.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { conversionCourses } from "./application-schema";
import { APPROVAL_ROLES, APPROVAL_ROLE_LABELS, APPROVED_STATUSES } from "./approvals";
import { prisma } from "./prisma";
import { readStoredFile } from "./storage";

function signingKey(): string {
  const key = process.env.DOCUMENT_SIGNING_SECRET ?? process.env.SESSION_SECRET;
  if (!key || key.length < 32) throw new Error("DOCUMENT_SIGNING_SECRET belum diset (minimal 32 karakter).");
  return key;
}

/** Kode verifikasi 20 karakter dari HMAC-SHA256 atas data kanonik dokumen resmi. */
export function signCode(canonical: string): string {
  return createHmac("sha256", signingKey()).update(canonical).digest("hex").slice(0, 20).toUpperCase();
}

/** Bandingkan kode secara constant-time (mengabaikan tanda hubung & huruf besar/kecil). */
export function codesMatch(given: string | null | undefined, expected: string): boolean {
  const a = Buffer.from((given ?? "").replace(/-/g, "").toUpperCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function loadApplication(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: { select: { fullName: true, nimNip: true } },
      vacancy: {
        select: {
          title: true,
          grantContractNumber: true,
          grantScheme: true,
          lecturer: { select: { fullName: true, nimNip: true } },
        },
      },
      approvals: { include: { approver: { select: { fullName: true, nimNip: true } } } },
    },
  });
}

export type ApprovalCertificate = NonNullable<Awaited<ReturnType<typeof buildCertificate>>>;

/** Susun data lembar pengesahan + kode verifikasi. Null bila e-approval belum lengkap. */
export async function buildCertificate(applicationId: string) {
  const app = await loadApplication(applicationId);
  if (!app || !APPROVED_STATUSES.includes(app.status)) return null;

  const approvals = APPROVAL_ROLES.map((role) => app.approvals.find((a) => a.approverRole === role));
  if (approvals.some((a) => !a || a.status !== "APPROVED" || !a.decidedAt)) return null;
  const signed = approvals as NonNullable<(typeof approvals)[number]>[];

  const file = await readStoredFile(app.proposalFileUrl);
  const proposalSha256 = file ? createHash("sha256").update(file).digest("hex") : "MISSING";
  const { list: courses, totalCredits } = conversionCourses(app.conversionScheme, app.includesKpConversion);
  const completedAt = new Date(Math.max(...signed.map((a) => a.decidedAt!.getTime())));

  const canonical = JSON.stringify({
    v: 1,
    applicationId: app.id,
    nim: app.student.nimNip,
    student: app.student.fullName,
    research: app.vacancy.title,
    contract: app.vacancy.grantContractNumber,
    proposalTitle: app.proposalTitle,
    conversion: app.conversionScheme,
    kp: app.includesKpConversion,
    gpa: Number(app.gpaAtApplication).toFixed(2),
    proposalSha256,
    approvals: signed.map((a) => ({ role: a.approverRole, nip: a.approver.nimNip, at: a.decidedAt!.toISOString() })),
  });
  const signature = createHmac("sha256", signingKey()).update(canonical).digest("hex");
  const code = signature.slice(0, 20).toUpperCase();

  const year = completedAt.getFullYear();
  const documentNumber = `SIRISET/MB04/${year}/${app.id.slice(0, 8).toUpperCase()}`;

  return {
    application: app,
    approvals: signed.map((a) => ({ ...a, roleLabel: APPROVAL_ROLE_LABELS[a.approverRole] })),
    courses,
    totalCredits,
    completedAt,
    proposalSha256,
    code,
    signature,
    documentNumber,
  };
}

/** Simpan kode verifikasi saat e-approval lengkap (sekali saja; tidak menimpa kode yang sudah ada). */
export async function freezeCertificateCode(applicationId: string) {
  const cert = await buildCertificate(applicationId);
  if (!cert) return null;
  await prisma.application.updateMany({
    where: { id: applicationId, approvalCertificateCode: null },
    data: { approvalCertificateCode: cert.code },
  });
  return cert.code;
}

/** Kode tampilan berkelompok: ABCD-EFGH-IJKL-MNOP-QRST */
export function formatCode(code: string) {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

/** Verifikasi kode QR terhadap data terkini. */
export async function verifyCertificate(applicationId: string, code: string | undefined) {
  const cert = await buildCertificate(applicationId);
  if (!cert) return { valid: false as const, reason: "Dokumen tidak ditemukan atau e-approval belum lengkap.", cert: null };
  const given = Buffer.from((code ?? "").replace(/-/g, "").toUpperCase());
  const expected = Buffer.from(cert.code);
  const valid = given.length === expected.length && timingSafeEqual(given, expected);
  return valid
    ? { valid: true as const, reason: null, cert }
    : {
        valid: false as const,
        reason: "Kode verifikasi tidak cocok — data dokumen telah berubah sejak disahkan atau kode tidak sah.",
        cert,
      };
}

export async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** URL verifikasi publik + SVG QR-Code. */
export async function certificateQr(cert: ApprovalCertificate) {
  return qrFor(`${await appOrigin()}/verify/${cert.application.id}?c=${cert.code}`);
}

/** SVG QR-Code (warna navy UTM) untuk URL verifikasi dokumen resmi. */
export async function qrFor(url: string) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f2b5c", light: "#ffffff" },
  });
  return { url, svg };
}
