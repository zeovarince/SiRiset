/**
 * Hub Laporan Kemajuan & Monev Digital LPPM (FR-07, bpmn-tobe §4.6 & §8 kasus 4).
 * - Jendela unggah laporan kemajuan terbuka pada minggu ke-8 riset.
 * - Satu laporan per riset; dapat diperbarui selama belum dinilai reviewer.
 * - Reviewer LPPM menilai laporan + rekap logbook minggu 1–8; hasil langsung terbaca dosen & mahasiswa.
 */
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";
import { allWeeks, complianceRate, currentWeek, weekWindow } from "./logbook-schedule";
import type { MonevEvaluationInput, ProgressReportInput } from "./monev-schema";
import { prisma } from "./prisma";
import { deleteStoredFile, savePdf } from "./storage";

export const MONEV_WEEK = 8;
export const MAJOR_REVISION_THRESHOLD = 40; // bpmn-tobe §8 kasus 4

export class MonevRuleError extends Error {}

const reportInclude = {
  monevEvaluations: {
    orderBy: { evaluatedAt: "asc" },
    include: { reviewer: { select: { fullName: true, nimNip: true } } },
  },
} satisfies Prisma.ProgressReportInclude;

export type ReportWithEvaluations = Prisma.ProgressReportGetPayload<{ include: typeof reportInclude }>;
export type EvaluationWithReviewer = ReportWithEvaluations["monevEvaluations"][number];

/* ─────────────────────────────── Penilaian ─────────────────────────────── */

export function monevGrade(e: { scoreProgress: unknown; scoreMethodology: unknown }) {
  const progress = Number(e.scoreProgress);
  const methodology = Number(e.scoreMethodology);
  const average = (progress + methodology) / 2;
  const category =
    average >= 80 ? "Sangat Baik" : average >= 70 ? "Baik" : average >= 55 ? "Cukup" : average >= 40 ? "Kurang" : "Tidak Memadai";
  const tone = average >= 70 ? ("success" as const) : average >= 55 ? ("warning" as const) : ("danger" as const);
  return { progress, methodology, average, category, tone, majorRevision: progress < MAJOR_REVISION_THRESHOLD };
}

/** Jendela monev riset: kapan dibuka & apakah sudah terbuka. */
export function monevWindow(startDate: Date, now = new Date()) {
  const w = weekWindow(startDate, MONEV_WEEK);
  const week = currentWeek(startDate, now);
  return { opensOn: w.monday, open: week >= MONEV_WEEK, currentWeek: week, weeksUntil: Math.max(0, MONEV_WEEK - week) };
}

/** Rekap kepatuhan logbook minggu 1–8 (bahan sesi monev, FR-07.2). */
export function logbookRecap(startDate: Date, logbooks: { weekNumber: number; isLate: boolean; status: string; durationHours: number }[]) {
  const upTo = logbooks.filter((l) => l.weekNumber <= MONEV_WEEK);
  const cutoff = weekWindow(startDate, MONEV_WEEK).lateCutoff;
  const asOf = new Date(Math.min(Date.now(), cutoff.getTime()));
  const compliance = complianceRate(startDate, upTo, asOf);
  const byWeek = new Map(upTo.map((l) => [l.weekNumber, l]));
  return {
    weeks: allWeeks(startDate)
      .slice(0, MONEV_WEEK)
      .map((w) => ({ window: w, entry: byWeek.get(w.week) ?? null, passed: asOf.getTime() >= w.lateCutoff.getTime() })),
    compliance,
    totalHours: upTo.reduce((n, l) => n + l.durationHours, 0),
    validated: upTo.filter((l) => l.status === "VALIDATED").length,
    filled: upTo.length,
  };
}

/* ─────────────────────────────── Data per riset ─────────────────────────────── */

export async function getReportForApplication(applicationId: string) {
  return prisma.progressReport.findFirst({
    where: { applicationId },
    orderBy: { submittedAt: "desc" },
    include: reportInclude,
  });
}

/**
 * Unggah / perbarui laporan kemajuan mahasiswa.
 * Laporan pertama wajib menyertakan PDF; pembaruan boleh tanpa PDF baru.
 */
export async function submitProgressReport(params: {
  studentId: string;
  applicationId: string;
  input: ProgressReportInput;
  pdf: Buffer | null;
}) {
  const app = await prisma.application.findUnique({
    where: { id: params.applicationId },
    select: { id: true, studentId: true, status: true, coordinatorValidatedAt: true, createdAt: true },
  });
  if (!app || app.studentId !== params.studentId) throw new MonevRuleError("Riset tidak ditemukan.");
  if (app.status !== "IN_PROGRESS") throw new MonevRuleError("Laporan kemajuan hanya dapat diunggah selama riset aktif.");

  const window = monevWindow(app.coordinatorValidatedAt ?? app.createdAt);
  if (!window.open) {
    throw new MonevRuleError(`Jendela unggah laporan kemajuan baru terbuka pada minggu ke-${MONEV_WEEK} (${window.opensOn}).`);
  }

  const existing = await getReportForApplication(app.id);
  if (existing && existing.monevEvaluations.length > 0) {
    throw new MonevRuleError("Laporan kemajuan sudah dinilai Reviewer LPPM dan tidak dapat diubah.");
  }
  if (!existing && !params.pdf) throw new MonevRuleError("Berkas laporan kemajuan (PDF) wajib diunggah.");

  const fileKey = params.pdf ? await savePdf("reports", params.pdf) : null;
  const data = {
    reportTitle: params.input.reportTitle,
    researchProgressSummary: params.input.researchProgressSummary,
    estimatedPercentage: params.input.estimatedPercentage.toFixed(2),
    ...(fileKey ? { reportFileUrl: fileKey } : {}),
  };

  try {
    if (existing) {
      // Berkas lama tetap disimpan sebagai jejak audit (tidak dihapus).
      const updated = await prisma.progressReport.update({
        where: { id: existing.id },
        data: { ...data, submittedAt: new Date() },
        select: { id: true },
      });
      return { id: updated.id, created: false };
    }
    const created = await prisma.progressReport.create({
      data: { ...data, reportFileUrl: fileKey!, applicationId: app.id },
      select: { id: true },
    });
    return { id: created.id, created: true };
  } catch (err) {
    if (fileKey) await deleteStoredFile(fileKey);
    throw err;
  }
}

/* ─────────────────────────────── Sisi Reviewer LPPM ─────────────────────────────── */

const sessionAppInclude = {
  student: { select: { fullName: true, nimNip: true } },
  vacancy: { select: { title: true, grantContractNumber: true, lecturer: { select: { fullName: true } } } },
  logbooks: { select: { weekNumber: true, isLate: true, status: true, durationHours: true } },
} satisfies Prisma.ApplicationInclude;

/** Daftar laporan masuk + peserta minggu ≥ 8 yang belum mengumpulkan. */
export async function listMonevSession() {
  const apps = await prisma.application.findMany({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    include: {
      ...sessionAppInclude,
      progressReports: { orderBy: { submittedAt: "desc" }, take: 1, include: reportInclude },
    },
    orderBy: { coordinatorValidatedAt: "asc" },
  });

  const rows = apps.map((app) => {
    const startDate = app.coordinatorValidatedAt ?? app.createdAt;
    const report = app.progressReports[0] ?? null;
    return {
      app,
      startDate,
      report,
      window: monevWindow(startDate),
      recap: logbookRecap(startDate, app.logbooks),
    };
  });

  return {
    submitted: rows.filter((r) => r.report),
    missing: rows.filter((r) => !r.report && r.window.open),
    upcoming: rows.filter((r) => !r.report && !r.window.open),
  };
}

/** Simpan penilaian sesi monev (satu penilaian per reviewer per laporan). */
export async function evaluateReport(params: {
  reviewer: Pick<CurrentUser, "id">;
  reportId: string;
  input: MonevEvaluationInput;
}) {
  const report = await prisma.progressReport.findUnique({
    where: { id: params.reportId },
    select: { id: true, application: { select: { status: true, student: { select: { fullName: true } } } } },
  });
  if (!report) throw new MonevRuleError("Laporan kemajuan tidak ditemukan.");

  try {
    const evaluation = await prisma.monevEvaluation.create({
      data: {
        progressReportId: report.id,
        reviewerId: params.reviewer.id,
        scoreProgress: params.input.scoreProgress.toFixed(2),
        scoreMethodology: params.input.scoreMethodology.toFixed(2),
        evaluationNotes: params.input.evaluationNotes,
        improvementRecommendations: params.input.improvementRecommendations ?? null,
      },
      select: { id: true },
    });
    return { id: evaluation.id, studentName: report.application.student.fullName, grade: monevGrade(params.input) };
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      throw new MonevRuleError("Anda sudah menilai laporan kemajuan ini.");
    }
    throw err;
  }
}

/** Hak akses berkas laporan: mahasiswa pemilik, dosen pembimbing, reviewer LPPM, & pengelola prodi. */
export async function canAccessReport(user: CurrentUser, reportId: string) {
  const report = await prisma.progressReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reportFileUrl: true,
      application: { select: { studentId: true, student: { select: { nimNip: true } }, vacancy: { select: { lecturerId: true } } } },
    },
  });
  if (!report) return null;
  const a = report.application;
  const allowed =
    a.studentId === user.id ||
    a.vacancy.lecturerId === user.id ||
    ["LPPM_REVIEWER", "KOORDINATOR_MBKM", "KAPRODI", "ADMIN"].includes(user.activeRole);
  return allowed ? report : null;
}
