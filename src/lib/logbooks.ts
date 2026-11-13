/**
 * Layanan Digital Weekly Logbook & Inline Mentoring (FR-06, bpmn-tobe §4.5).
 */
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";
import { startOfDayWIB, todayWIB } from "./format";
import type { LogbookInput, LogbookReviewInput } from "./logbook-schema";
import {
  TOTAL_WEEKS,
  allWeeks,
  complianceRate,
  currentWeek,
  isLateSubmission,
  weekWindow,
  type WeekWindow,
} from "./logbook-schedule";
import { prisma } from "./prisma";
import { deleteStoredFile, saveUpload, type StoredExt } from "./storage";

export class LogbookRuleError extends Error {}

const logbookInclude = {
  reviews: {
    orderBy: { reviewedAt: "asc" },
    include: { reviewer: { select: { fullName: true } } },
  },
} satisfies Prisma.LogbookInclude;

export type LogbookWithReviews = Prisma.LogbookGetPayload<{ include: typeof logbookInclude }>;

/* ─────────────────────────── Status tampilan per minggu ─────────────────────────── */

export type WeekStateKey = "VALIDATED" | "SUBMITTED" | "REVISION_NEEDED" | "MISSING" | "OPEN" | "LOCKED";

export const WEEK_STATE: Record<WeekStateKey, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = {
  VALIDATED: { label: "Valid", tone: "success" },
  SUBMITTED: { label: "Menunggu Ulasan", tone: "info" },
  REVISION_NEEDED: { label: "Perlu Revisi", tone: "warning" },
  MISSING: { label: "Tidak Diisi", tone: "danger" },
  OPEN: { label: "Belum Diisi", tone: "neutral" },
  LOCKED: { label: "Belum Dibuka", tone: "neutral" },
};

export function weekState(w: WeekWindow, entry: { status: string } | undefined, current: number, now = new Date()): WeekStateKey {
  if (entry) {
    if (entry.status === "VALIDATED") return "VALIDATED";
    if (entry.status === "REVISION_NEEDED") return "REVISION_NEEDED";
    return "SUBMITTED";
  }
  if (w.week > current) return "LOCKED";
  return now.getTime() > w.lateCutoff.getTime() ? "MISSING" : "OPEN";
}

/* ─────────────────────────────── Sisi Mahasiswa ─────────────────────────────── */

/** Riset aktif mahasiswa beserta seluruh logbook & ulasan dosen. */
export async function getStudentResearch(studentId: string) {
  const app = await prisma.application.findFirst({
    where: { studentId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    orderBy: { coordinatorValidatedAt: "desc" },
    include: {
      vacancy: { select: { title: true, lecturer: { select: { fullName: true } } } },
      logbooks: { orderBy: { weekNumber: "asc" }, include: logbookInclude },
    },
  });
  if (!app) return null;
  const startDate = app.coordinatorValidatedAt ?? app.createdAt;
  return {
    app,
    startDate,
    weeks: allWeeks(startDate),
    current: currentWeek(startDate),
    compliance: complianceRate(startDate, app.logbooks),
  };
}

/**
 * Simpan logbook minggu tertentu (buat baru, atau perbarui bila masih SUBMITTED / REVISION_NEEDED).
 * - Minggu yang belum dibuka tidak dapat diisi.
 * - Tanggal pelaksanaan harus di dalam rentang Senin–Minggu minggu tersebut dan tidak di masa depan.
 * - is_late ditetapkan saat pengisian pertama (lewat Minggu 23:59 WIB) dan tidak berubah saat revisi.
 * - Wajib ada bukti: berkas unggahan ATAU tautan repositori (FR-06.1).
 */
export async function saveLogbook(params: {
  studentId: string;
  applicationId: string;
  week: number;
  input: LogbookInput;
  evidence: { bytes: Buffer; ext: StoredExt } | null;
}) {
  const app = await prisma.application.findUnique({
    where: { id: params.applicationId },
    select: { id: true, studentId: true, status: true, coordinatorValidatedAt: true, createdAt: true },
  });
  if (!app || app.studentId !== params.studentId) throw new LogbookRuleError("Riset tidak ditemukan.");
  if (app.status !== "IN_PROGRESS") throw new LogbookRuleError("Logbook hanya dapat diisi selama riset berstatus aktif.");

  const startDate = app.coordinatorValidatedAt ?? app.createdAt;
  const current = currentWeek(startDate);
  if (!Number.isInteger(params.week) || params.week < 1 || params.week > TOTAL_WEEKS) {
    throw new LogbookRuleError("Minggu pelaksanaan tidak valid (1–16).");
  }
  if (params.week > current) throw new LogbookRuleError(`Logbook minggu ke-${params.week} belum dibuka.`);

  const w = weekWindow(startDate, params.week);
  const latestAllowed = w.sunday < todayWIB() ? w.sunday : todayWIB();
  if (params.input.activityDate < w.monday || params.input.activityDate > latestAllowed) {
    throw new LogbookRuleError(`Tanggal pelaksanaan harus antara ${w.monday} dan ${latestAllowed} (minggu ke-${params.week}).`);
  }

  const existing = await prisma.logbook.findUnique({
    where: { applicationId_weekNumber: { applicationId: app.id, weekNumber: params.week } },
    select: { id: true, status: true, evidenceFileUrl: true },
  });
  if (existing?.status === "VALIDATED") {
    throw new LogbookRuleError("Logbook minggu ini sudah divalidasi dosen dan tidak dapat diubah.");
  }
  if (!params.evidence && !params.input.repositoryLink && !existing?.evidenceFileUrl) {
    throw new LogbookRuleError("Lampirkan minimal satu bukti: unggah foto/screenshot/dokumen ATAU tautan repositori kode.");
  }

  const evidenceKey = params.evidence ? await saveUpload("logbooks", params.evidence.bytes, params.evidence.ext) : null;
  const data = {
    activityDate: startOfDayWIB(params.input.activityDate),
    durationHours: params.input.durationHours,
    activityDescription: params.input.activityDescription,
    challengesFaced: params.input.challengesFaced ?? null,
    solutionsImplemented: params.input.solutionsImplemented ?? null,
    repositoryLink: params.input.repositoryLink ?? null,
    ...(evidenceKey ? { evidenceFileUrl: evidenceKey } : {}),
    status: "SUBMITTED" as const,
  };

  try {
    if (existing) {
      const updated = await prisma.logbook.update({ where: { id: existing.id }, data, select: { id: true, isLate: true } });
      return { ...updated, created: false, window: w };
    }
    const now = new Date();
    const created = await prisma.logbook.create({
      data: { ...data, applicationId: app.id, weekNumber: params.week, isLate: isLateSubmission(w, now), submittedAt: now },
      select: { id: true, isLate: true },
    });
    return { ...created, created: true, window: w };
  } catch (err) {
    if (evidenceKey) await deleteStoredFile(evidenceKey);
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      throw new LogbookRuleError("Logbook minggu ini sudah diisi.");
    }
    throw err;
  }
}

/* ─────────────────────────────── Sisi Dosen Peneliti ─────────────────────────────── */

/** Mahasiswa bimbingan (riset aktif/selesai pada lowongan milik dosen) + ringkasan kepatuhan. */
export async function listMentees(lecturerId: string) {
  const apps = await prisma.application.findMany({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] }, vacancy: { lecturerId } },
    orderBy: { coordinatorValidatedAt: "asc" },
    include: {
      student: { select: { fullName: true, nimNip: true } },
      vacancy: { select: { title: true } },
      logbooks: { orderBy: { weekNumber: "asc" }, include: logbookInclude },
    },
  });
  return apps.map((app) => {
    const startDate = app.coordinatorValidatedAt ?? app.createdAt;
    return {
      app,
      startDate,
      weeks: allWeeks(startDate),
      current: currentWeek(startDate),
      compliance: complianceRate(startDate, app.logbooks),
      pendingReview: app.logbooks.filter((l) => l.status === "SUBMITTED").length,
      totalHours: app.logbooks.reduce((n, l) => n + l.durationHours, 0),
    };
  });
}

/** Ulasan dosen: validasi atau minta revisi, beserta catatan bimbingan inline. */
export async function reviewLogbook(params: {
  lecturer: Pick<CurrentUser, "id" | "activeRole">;
  logbookId: string;
  input: LogbookReviewInput;
}) {
  return prisma.$transaction(async (tx) => {
    const logbook = await tx.logbook.findUnique({
      where: { id: params.logbookId },
      select: {
        id: true,
        status: true,
        weekNumber: true,
        applicationId: true,
        application: { select: { vacancy: { select: { lecturerId: true } }, student: { select: { fullName: true } } } },
      },
    });
    if (
      !logbook ||
      (logbook.application.vacancy.lecturerId !== params.lecturer.id && params.lecturer.activeRole !== "ADMIN")
    ) {
      throw new LogbookRuleError("Logbook tidak ditemukan pada daftar mahasiswa bimbingan Anda.");
    }
    if (logbook.status !== "SUBMITTED") {
      throw new LogbookRuleError(
        logbook.status === "REVISION_NEEDED"
          ? "Logbook ini sedang menunggu perbaikan mahasiswa."
          : "Logbook ini sudah divalidasi.",
      );
    }

    await tx.logbookReview.create({
      data: {
        logbookId: logbook.id,
        reviewerId: params.lecturer.id,
        reviewStatus: params.input.reviewStatus,
        feedbackNotes: params.input.feedbackNotes ?? null,
      },
    });
    await tx.logbook.update({
      where: { id: logbook.id },
      data: { status: params.input.reviewStatus === "APPROVED" ? "VALIDATED" : "REVISION_NEEDED" },
    });
    return {
      applicationId: logbook.applicationId,
      weekNumber: logbook.weekNumber,
      studentName: logbook.application.student.fullName,
    };
  });
}

/** Hak akses berkas bukti logbook (RBAC matrix: Logbook Mingguan). */
export async function canAccessLogbook(user: CurrentUser, logbookId: string) {
  const logbook = await prisma.logbook.findUnique({
    where: { id: logbookId },
    select: {
      id: true,
      weekNumber: true,
      evidenceFileUrl: true,
      application: {
        select: {
          studentId: true,
          student: { select: { nimNip: true, academicAdvisorId: true } },
          vacancy: { select: { lecturerId: true } },
        },
      },
    },
  });
  if (!logbook) return null;
  const a = logbook.application;
  const allowed =
    a.studentId === user.id ||
    a.vacancy.lecturerId === user.id ||
    a.student.academicAdvisorId === user.id ||
    ["KAPRODI", "KOORDINATOR_MBKM", "LPPM_REVIEWER", "ADMIN"].includes(user.activeRole);
  return allowed ? logbook : null;
}
