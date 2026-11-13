/**
 * Pengukuran KPI AKTUAL dari data SiRiset (bukti terukur pendamping angka skenario di kpi-baseline.ts).
 * Seluruh nilai dihitung dari basis data saat halaman dibuka.
 */
import { BA_ACTION } from "./assessments";
import { getSyncOverview } from "./coordinator";
import { complianceRate } from "./logbook-schedule";
import { prisma } from "./prisma";

const DAY = 86_400_000;

function avg(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Format durasi (hari) menjadi teks ramah: menit / jam / hari. */
export function formatDuration(days: number | null): string {
  if (days === null) return "—";
  const minutes = days * 24 * 60;
  if (minutes < 1) return "< 1 menit";
  if (minutes < 60) return `${Math.round(minutes)} menit`;
  if (days < 1) return `${(days * 24).toFixed(1).replace(".", ",")} jam`;
  return `${days.toFixed(1).replace(".", ",")} hari`;
}

export async function measureKpis() {
  const [decided, approved, syncs, locked, bas, active, docs] = await Promise.all([
    // 1. Lead time seleksi: pendaftaran → keputusan dosen
    prisma.application.findMany({
      where: { selectionDecidedAt: { not: null } },
      select: { createdAt: true, selectionDecidedAt: true },
    }),
    // 2. E-approval: keputusan dosen (fork) → persetujuan ketiga (join)
    prisma.application.findMany({
      where: { status: { in: ["APPROVAL_COMPLETE", "IN_PROGRESS", "COMPLETED"] }, selectionDecidedAt: { not: null } },
      select: { selectionDecidedAt: true, approvals: { select: { status: true, decidedAt: true } } },
    }),
    // 3. Sinkronisasi: validasi koordinator → sinkron sukses pertama
    prisma.application.findMany({
      where: { coordinatorValidatedAt: { not: null }, syncLogs: { some: { syncStatus: "SUCCESS" } } },
      select: {
        coordinatorValidatedAt: true,
        syncLogs: { where: { syncStatus: "SUCCESS" }, orderBy: { syncedAt: "asc" }, take: 1, select: { syncedAt: true } },
      },
    }),
    // 4. Konversi nilai: nilai terbit dosen → terkunci di berita acara
    prisma.gradeAssessment.findMany({
      where: { isLockedByCoordinator: true },
      select: { applicationId: true, finalizedAt: true },
    }),
    prisma.auditLog.findMany({ where: { actionName: BA_ACTION }, orderBy: { createdAt: "asc" }, select: { createdAt: true, payloadJson: true } }),
    // 5. Kepatuhan logbook seluruh peserta riset aktif/selesai
    prisma.application.findMany({
      where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
      select: { coordinatorValidatedAt: true, createdAt: true, logbooks: { select: { weekNumber: true, isLate: true } } },
    }),
    // 6. Dokumen digital yang menggantikan berkas kertas
    Promise.all([
      prisma.application.count(),
      prisma.applicationApproval.count({ where: { status: "APPROVED" } }),
      prisma.logbook.count(),
      prisma.progressReport.count(),
      prisma.researchOutput.count(),
      prisma.gradeAssessment.count(),
    ]),
  ]);

  const selectionDays = avg(decided.map((a) => (a.selectionDecidedAt!.getTime() - a.createdAt.getTime()) / DAY));

  const approvalDays = avg(
    approved
      .filter((a) => a.approvals.length === 3 && a.approvals.every((x) => x.status === "APPROVED" && x.decidedAt))
      .map((a) => (Math.max(...a.approvals.map((x) => x.decidedAt!.getTime())) - a.selectionDecidedAt!.getTime()) / DAY)
      .filter((d) => d >= 0),
  );

  const syncDays = avg(
    syncs
      .map((a) => (a.syncLogs[0].syncedAt.getTime() - a.coordinatorValidatedAt!.getTime()) / DAY)
      .filter((d) => d >= 0),
  );

  // Waktu kunci = berita acara pertama yang memuat aplikasi tersebut.
  const lockedAt = new Map<string, number>();
  for (const b of bas) {
    const rows = (JSON.parse(b.payloadJson ?? "{}") as { rows?: { applicationId: string }[] }).rows ?? [];
    for (const r of rows) if (!lockedAt.has(r.applicationId)) lockedAt.set(r.applicationId, b.createdAt.getTime());
  }
  const gradeDays = avg(
    locked
      .filter((g) => lockedAt.has(g.applicationId))
      .map((g) => (lockedAt.get(g.applicationId)! - g.finalizedAt.getTime()) / DAY)
      .filter((d) => d >= 0),
  );

  let onTime = 0;
  let due = 0;
  for (const a of active) {
    const c = complianceRate(a.coordinatorValidatedAt ?? a.createdAt, a.logbooks);
    onTime += c.onTime;
    due += c.due;
  }

  const sync = await getSyncOverview();
  const digitalDocuments = docs.reduce((a, b) => a + b, 0) + bas.length;

  return {
    cycle: {
      selection: { days: selectionDays, n: decided.length },
      approval: { days: approvalDays, n: approved.length },
      sync: { days: syncDays, n: syncs.length },
      grade: { days: gradeDays, n: lockedAt.size },
    } as Record<string, { days: number | null; n: number }>,
    logbook: { onTime, late: due - onTime, rate: due ? (onTime / due) * 100 : null },
    mismatch: {
      verified: sync.verifiedCount,
      mismatch: sync.mismatchCount + sync.pendingCount,
      rate: sync.verifiedCount ? ((sync.mismatchCount + sync.pendingCount) / sync.verifiedCount) * 100 : 0,
    },
    activeParticipants: active.length,
    digitalDocuments,
    paperDocuments: 0,
  };
}
