/**
 * Layanan Koordinator MBKM — Tahap 4 To-Be (bpmn-tobe §4.4, FR-05).
 * 1. Validasi akhir prodi: APPROVAL_COMPLETE → IN_PROGRESS (riset aktif).
 * 2. Jembatan sinkronisasi 1-klik ke SIMPELMAS LPPM + deteksi mismatch data.
 * 3. Rekap peserta terverifikasi untuk usulan SK Dekan Fakultas Teknik.
 */
import type { Prisma } from "@prisma/client";
import { participantFingerprint } from "./simpelmas-fingerprint";
import { freezeCertificateCode, verifyCertificate } from "./approval-certificate";
import type { CurrentUser } from "./auth";
import { academicPeriod, toDateInputValue } from "./format";
import { prisma } from "./prisma";
import { pushParticipants, type SimpelmasParticipant } from "./simpelmas-mock";

export class CoordinatorRuleError extends Error {}

const PROGRAM_STUDY = "S1 Teknik Informatika";
const FACULTY_CODE = "FT";

const participantInclude = {
  student: { select: { fullName: true, nimNip: true } },
  vacancy: {
    select: {
      title: true,
      grantContractNumber: true,
      grantScheme: true,
      lecturer: { select: { fullName: true, nimNip: true } },
    },
  },
  approvals: { select: { approverRole: true, status: true, decidedAt: true } },
} satisfies Prisma.ApplicationInclude;

type ParticipantRow = Prisma.ApplicationGetPayload<{ include: typeof participantInclude }>;

/** Lama proses e-approval (jam) dari fork (diterima dosen) hingga persetujuan ketiga — KPI PP3. */
function approvalLeadHours(app: ParticipantRow): number | null {
  const times = app.approvals.map((a) => a.decidedAt?.getTime()).filter((t): t is number => Boolean(t));
  if (!app.selectionDecidedAt || times.length < 3) return null;
  return (Math.max(...times) - app.selectionDecidedAt.getTime()) / 3_600_000;
}

/* ───────────────────────────── 1. Validasi akhir prodi ───────────────────────────── */

export async function listAwaitingValidation() {
  const apps = await prisma.application.findMany({
    where: { status: "APPROVAL_COMPLETE" },
    include: participantInclude,
    orderBy: { selectionDecidedAt: "asc" },
  });
  return Promise.all(
    apps.map(async (a) => {
      // Bandingkan data terkini dengan kode yang dibekukan saat e-approval lengkap.
      // Data lama (lengkap sebelum Fase 4) belum punya kode → dibekukan sekali sekarang.
      const code = a.approvalCertificateCode ?? (await freezeCertificateCode(a.id));
      const check = code ? await verifyCertificate(a.id, code) : { valid: false as const };
      return { ...a, approvalLeadHours: approvalLeadHours(a), certificateValid: check.valid };
    }),
  );
}

/**
 * Validasi Akhir Prodi. Sebelum mengaktifkan riset, integritas lembar pengesahan QR diperiksa ulang:
 * berkas yang datanya berubah setelah disahkan tidak boleh divalidasi.
 */
export async function validateApplication(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, approvalCertificateCode: true, student: { select: { fullName: true } } },
  });
  if (!app) throw new CoordinatorRuleError("Pendaftaran tidak ditemukan.");
  if (app.status !== "APPROVAL_COMPLETE") {
    throw new CoordinatorRuleError("Hanya berkas berstatus APPROVAL_COMPLETE yang dapat divalidasi.");
  }

  // Data terkini harus masih cocok dengan kode stempel yang dibekukan saat e-approval lengkap.
  const frozen = app.approvalCertificateCode ?? (await freezeCertificateCode(app.id));
  const check = await verifyCertificate(app.id, frozen ?? undefined);
  if (!check.valid) {
    throw new CoordinatorRuleError(
      "Integritas lembar pengesahan tidak cocok — data berkas berubah setelah disahkan. Validasi dibatalkan.",
    );
  }

  // updateMany + filter status = optimistic lock: dua klik bersamaan hanya berhasil sekali.
  const result = await prisma.application.updateMany({
    where: { id: app.id, status: "APPROVAL_COMPLETE" },
    data: { status: "IN_PROGRESS", coordinatorValidatedAt: new Date() },
  });
  if (result.count === 0) throw new CoordinatorRuleError("Berkas ini sudah divalidasi sebelumnya.");
  return { studentName: app.student.fullName };
}

/* ───────────────────────────── 2. Sinkronisasi SIMPELMAS ───────────────────────────── */

export type SyncState = "SYNCED" | "MISMATCH" | "PENDING" | "ERROR";

function toParticipant(app: ParticipantRow): SimpelmasParticipant {
  return {
    nim: app.student.nimNip,
    studentName: app.student.fullName,
    programStudy: PROGRAM_STUDY,
    leadLecturerNip: app.vacancy.lecturer.nimNip,
    leadLecturerName: app.vacancy.lecturer.fullName,
    researchTitle: app.vacancy.title,
    grantContractNumber: app.vacancy.grantContractNumber,
    grantScheme: app.vacancy.grantScheme,
    startDate: toDateInputValue(app.coordinatorValidatedAt ?? app.createdAt),
    academicPeriod: academicPeriod().code,
    facultyCode: FACULTY_CODE,
  };
}

/** Sidik jari data inti peserta — berbeda = data prodi sudah berubah sejak sinkron terakhir. */
function fingerprint(p: SimpelmasParticipant): string {
  return participantFingerprint(p);
}

/** Peserta terverifikasi prodi (riset aktif / selesai) beserta status sinkron ke SIMPELMAS. */
export async function getSyncOverview() {
  const apps = await prisma.application.findMany({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    include: { ...participantInclude, syncLogs: { orderBy: { syncedAt: "desc" } } },
    orderBy: { coordinatorValidatedAt: "asc" },
  });

  const rows = apps.map((app) => {
    const participant = toParticipant(app);
    const current = fingerprint(participant);
    const lastSuccess = app.syncLogs.find((l) => l.syncStatus === "SUCCESS");
    const latest = app.syncLogs[0];
    let syncedFingerprint: string | null = null;
    if (lastSuccess) {
      try {
        syncedFingerprint = (JSON.parse(lastSuccess.payloadSent) as { fingerprint?: string }).fingerprint ?? null;
      } catch {
        syncedFingerprint = null;
      }
    }

    const state: SyncState = lastSuccess
      ? syncedFingerprint === current
        ? "SYNCED"
        : "MISMATCH"
      : latest?.syncStatus === "FAILED"
        ? "ERROR"
        : "PENDING";

    let lastError: string | null = null;
    if (state === "ERROR" && latest) {
      try {
        lastError = (JSON.parse(latest.responseReceived) as { message?: string }).message ?? null;
      } catch {
        lastError = null;
      }
    }

    return {
      app,
      participant,
      fingerprint: current,
      state,
      simpelmasId: lastSuccess?.simpelmasExternalId ?? null,
      lastSyncedAt: lastSuccess?.syncedAt ?? null,
      lastError,
    };
  });

  const recorded = rows.filter((r) => r.state === "SYNCED" || r.state === "MISMATCH").length;
  const mismatch = rows.filter((r) => r.state === "MISMATCH").length;
  const pending = rows.filter((r) => r.state === "PENDING" || r.state === "ERROR").length;
  const synced = rows.filter((r) => r.state === "SYNCED").length;

  const lastBatch = await prisma.simpelmasSyncLog.findFirst({
    where: { batchReferenceId: { not: null } },
    orderBy: { syncedAt: "desc" },
    select: { syncedAt: true, batchReferenceId: true, user: { select: { fullName: true } } },
  });

  return {
    rows,
    verifiedCount: rows.length,
    recordedCount: recorded,
    syncedCount: synced,
    mismatchCount: mismatch,
    pendingCount: pending,
    syncPercent: rows.length ? Math.round((synced / rows.length) * 100) : 100,
    lastBatch,
  };
}

async function nextBatchReferenceId(now: Date): Promise<string> {
  const day = toDateInputValue(now);
  const prefix = `SYNC-SIMPELMAS-${day}-`;
  const existing = await prisma.simpelmasSyncLog.findMany({
    where: { batchReferenceId: { startsWith: prefix } },
    distinct: ["batchReferenceId"],
    select: { batchReferenceId: true },
  });
  return `${prefix}${String(existing.length + 1).padStart(3, "0")}`;
}

/**
 * 1-Click Sync (api-spec §6.1): kirim peserta yang belum tercatat / berubah / gagal ke SIMPELMAS,
 * lalu catat setiap baris di simpelmas_sync_logs dengan ID referensi batch yang sama.
 */
export async function runSimpelmasSync(actor: Pick<CurrentUser, "id">) {
  const overview = await getSyncOverview();
  const targets = overview.rows.filter((r) => r.state !== "SYNCED");
  const now = new Date();

  if (targets.length === 0) {
    return { syncedCount: 0, failedCount: 0, timestamp: now.toISOString(), batchReferenceId: null, alreadySynced: true };
  }

  const batchReferenceId = await nextBatchReferenceId(now);
  const request = {
    batchReferenceId,
    sourceSystem: "SIRISET-TI-UTM" as const,
    participants: targets.map((t) => t.participant),
  };
  const response = await pushParticipants(request);

  await prisma.$transaction(
    targets.map((t) => {
      const result = response.results.find((r) => r.nim === t.participant.nim) ?? {
        nim: t.participant.nim,
        status: "REJECTED" as const,
        errorCode: "NO_RESPONSE",
        message: "SIMPELMAS tidak mengembalikan hasil untuk peserta ini.",
      };
      return prisma.simpelmasSyncLog.create({
        data: {
          applicationId: t.app.id,
          triggeredBy: actor.id,
          batchReferenceId,
          syncStatus: result.status === "ACCEPTED" ? "SUCCESS" : "FAILED",
          simpelmasExternalId: result.status === "ACCEPTED" ? result.simpelmasId : null,
          payloadSent: JSON.stringify({ batchReferenceId, fingerprint: t.fingerprint, participant: t.participant }),
          responseReceived: JSON.stringify(result),
          syncedAt: now,
        },
      });
    }),
  );

  const syncedCount = response.results.filter((r) => r.status === "ACCEPTED").length;
  return {
    syncedCount,
    failedCount: targets.length - syncedCount,
    timestamp: now.toISOString(),
    batchReferenceId,
    alreadySynced: false,
  };
}

/** Riwayat batch sinkronisasi (dikelompokkan per ID referensi). */
export async function listSyncBatches(take = 10) {
  const logs = await prisma.simpelmasSyncLog.findMany({
    where: { batchReferenceId: { not: null } },
    orderBy: { syncedAt: "desc" },
    take: 200,
    select: {
      batchReferenceId: true,
      syncStatus: true,
      syncedAt: true,
      user: { select: { fullName: true } },
      application: { select: { student: { select: { fullName: true } } } },
    },
  });
  const batches = new Map<
    string,
    { id: string; syncedAt: Date; by: string; success: number; failed: number; students: string[] }
  >();
  for (const l of logs) {
    const id = l.batchReferenceId!;
    const b = batches.get(id) ?? { id, syncedAt: l.syncedAt, by: l.user.fullName, success: 0, failed: 0, students: [] };
    if (l.syncStatus === "SUCCESS") b.success++;
    else b.failed++;
    b.students.push(l.application.student.fullName);
    batches.set(id, b);
  }
  return [...batches.values()].slice(0, take);
}

/* ───────────────────────────── 3. Rekap usulan SK Dekan ───────────────────────────── */

/** Data terstruktur peserta tervalidasi untuk lampiran usulan SK Dekan Fakultas Teknik. */
export async function getSkDekanRecap() {
  const overview = await getSyncOverview();
  // Peserta lama (aktif sebelum Fase 4) belum punya kode QR beku → bekukan sekali.
  const codes = await Promise.all(
    overview.rows.map((r) => r.app.approvalCertificateCode ?? freezeCertificateCode(r.app.id)),
  );
  return {
    period: academicPeriod(),
    generatedAt: new Date(),
    unsyncedCount: overview.pendingCount + overview.mismatchCount,
    rows: overview.rows.map((r, i) => ({
      no: i + 1,
      nim: r.participant.nim,
      studentName: r.participant.studentName,
      programStudy: r.participant.programStudy,
      researchTitle: r.participant.researchTitle,
      leadLecturerName: r.participant.leadLecturerName,
      leadLecturerNip: r.participant.leadLecturerNip,
      grantContractNumber: r.participant.grantContractNumber,
      grantScheme: r.participant.grantScheme,
      conversion: r.app.includesKpConversion ? "MB04 20 SKS + KP 2 SKS" : "MB04 20 SKS",
      credits: r.app.includesKpConversion ? 22 : 20,
      startDate: r.participant.startDate,
      simpelmasId: r.simpelmasId,
      syncState: r.state,
      certificateCode: codes[i],
    })),
  };
}
