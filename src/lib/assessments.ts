/**
 * Penilaian Rubrik Digital & Konversi Nilai MB04 (FR-09, bpmn-tobe §4.7).
 *
 * Alur:
 *  1. Dosen Peneliti menyimpan draf / menerbitkan nilai (4 rubrik berbobot → nilai angka & huruf mutu).
 *     Terbit ⇒ grade_assessments final + status riset COMPLETED.
 *  2. Koordinator MBKM mengunci nilai (freeze) & menerbitkan Berita Acara Nilai Resmi ber-QR.
 *     Berita acara dicatat sebagai entri audit_logs (append-only) berisi snapshot nilai + kode HMAC,
 *     sehingga halaman verifikasi publik dapat mendeteksi perubahan nilai setelah berita acara terbit.
 */
import type { Prisma } from "@prisma/client";
import { signCode } from "./approval-certificate";
import type { CurrentUser } from "./auth";
import { academicPeriod } from "./format";
import { RUBRIC, finalScore, gradeConversion, gradeSummary, letterGrade, type LetterGrade, type RubricScores } from "./grading";
import type { AssessmentInput } from "./grading-schema";
import { TOTAL_WEEKS, complianceRate, currentWeek } from "./logbook-schedule";
import { monevGrade } from "./monev";
import { prisma } from "./prisma";

export class AssessmentRuleError extends Error {}

export const BA_ACTION = "EXPORT_BERITA_ACARA";

function toScores(a: AssessmentInput | Record<string, unknown>): RubricScores {
  return Object.fromEntries(RUBRIC.map((r) => [r.key, Number((a as Record<string, unknown>)[r.key])])) as RubricScores;
}

/* ─────────────────────────────── Dosen Peneliti ─────────────────────────────── */

const rosterInclude = {
  student: { select: { fullName: true, nimNip: true } },
  vacancy: { select: { title: true, lecturerId: true } },
  outputs: { orderBy: { submittedAt: "asc" } },
  assessment: true,
  logbooks: { select: { weekNumber: true, isLate: true, status: true, durationHours: true } },
  progressReports: { include: { monevEvaluations: true }, orderBy: { submittedAt: "desc" }, take: 1 },
} satisfies Prisma.ApplicationInclude;

export type RosterEntry = Awaited<ReturnType<typeof getGradingRoster>>[number];

export type GradeState = "NOT_READY" | "READY" | "DRAFT" | "PUBLISHED" | "LOCKED";

/** Mahasiswa bimbingan + kesiapan penilaian (luaran terverifikasi, durasi 16 minggu). */
export async function getGradingRoster(lecturerId: string) {
  const apps = await prisma.application.findMany({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] }, vacancy: { lecturerId } },
    include: rosterInclude,
    orderBy: { coordinatorValidatedAt: "asc" },
  });
  return apps.map((app) => {
    const startDate = app.coordinatorValidatedAt ?? app.createdAt;
    const week = currentWeek(startDate);
    const verifiedOutputs = app.outputs.filter((o) => o.isVerifiedByLecturer).length;
    const blockers: string[] = [];
    if (verifiedOutputs === 0) blockers.push("Belum ada luaran yang diverifikasi sesuai target (FR-08.2).");
    if (week < TOTAL_WEEKS) {
      blockers.push(`Durasi riset belum 16 minggu (BR-04) — saat ini minggu ke-${Math.max(week, 0)}.`);
    }
    const evaluation = app.progressReports[0]?.monevEvaluations[0];
    const state: GradeState =
      app.assessment?.isLockedByCoordinator
        ? "LOCKED"
        : app.status === "COMPLETED"
          ? "PUBLISHED"
          : app.assessment
            ? "DRAFT"
            : blockers.length
              ? "NOT_READY"
              : "READY";
    return {
      app,
      startDate,
      week,
      compliance: complianceRate(startDate, app.logbooks),
      totalHours: app.logbooks.reduce((n, l) => n + l.durationHours, 0),
      validatedLogbooks: app.logbooks.filter((l) => l.status === "VALIDATED").length,
      monev: evaluation ? monevGrade(evaluation) : null,
      verifiedOutputs,
      blockers,
      state,
    };
  });
}

/**
 * Simpan draf atau terbitkan nilai resmi.
 * Terbitkan: wajib ≥ 1 luaran terverifikasi & riset sudah mencapai minggu ke-16; status riset → COMPLETED.
 */
export async function saveAssessment(params: {
  lecturer: Pick<CurrentUser, "id" | "activeRole">;
  applicationId: string;
  input: AssessmentInput;
  publish: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: params.applicationId },
      select: {
        id: true,
        status: true,
        coordinatorValidatedAt: true,
        createdAt: true,
        conversionScheme: true,
        includesKpConversion: true,
        student: { select: { fullName: true } },
        vacancy: { select: { lecturerId: true } },
        assessment: { select: { isLockedByCoordinator: true } },
        outputs: { where: { isVerifiedByLecturer: true }, select: { id: true } },
      },
    });
    if (!app || (app.vacancy.lecturerId !== params.lecturer.id && params.lecturer.activeRole !== "ADMIN")) {
      throw new AssessmentRuleError("Mahasiswa tidak ditemukan pada daftar bimbingan Anda.");
    }
    if (app.assessment?.isLockedByCoordinator) throw new AssessmentRuleError("Nilai sudah dikunci Koordinator MBKM.");
    if (app.status !== "IN_PROGRESS") throw new AssessmentRuleError("Nilai resmi sudah diterbitkan dan tidak dapat diubah.");

    if (params.publish) {
      if (app.outputs.length === 0) {
        throw new AssessmentRuleError("Verifikasi minimal satu luaran sesuai target sebelum menerbitkan nilai (FR-08.2).");
      }
      const week = currentWeek(app.coordinatorValidatedAt ?? app.createdAt);
      if (week < TOTAL_WEEKS) {
        throw new AssessmentRuleError(`Nilai resmi baru dapat diterbitkan setelah riset mencapai minggu ke-16 (BR-04). Saat ini minggu ke-${week}.`);
      }
    }

    const scores = toScores(params.input);
    const final = finalScore(scores);
    const letter = letterGrade(final);
    const data = {
      ...Object.fromEntries(RUBRIC.map((r) => [r.key, scores[r.key].toFixed(2)])),
      finalNumericScore: final.toFixed(2),
      letterGrade: letter,
      evaluatorId: params.lecturer.id,
      finalizedAt: new Date(),
    } as Prisma.GradeAssessmentUncheckedCreateInput;

    await tx.gradeAssessment.upsert({
      where: { applicationId: app.id },
      update: data,
      create: { ...data, applicationId: app.id },
    });
    if (params.publish) await tx.application.update({ where: { id: app.id }, data: { status: "COMPLETED" } });

    return {
      studentName: app.student.fullName,
      finalNumericScore: final,
      letterGrade: letter,
      conversion: gradeConversion(app.conversionScheme, app.includesKpConversion, letter),
      published: params.publish,
    };
  });
}

/** Nilai resmi untuk transkrip mahasiswa (hanya setelah diterbitkan). */
export async function getPublishedGrade(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { status: true, conversionScheme: true, includesKpConversion: true, assessment: { include: { evaluator: { select: { fullName: true } } } } },
  });
  if (!app?.assessment || app.status !== "COMPLETED") return null;
  const letter = app.assessment.letterGrade as LetterGrade;
  return {
    assessment: app.assessment,
    summary: gradeSummary(Number(app.assessment.finalNumericScore)),
    conversion: gradeConversion(app.conversionScheme, app.includesKpConversion, letter),
  };
}

/* ─────────────────────────────── Koordinator MBKM ─────────────────────────────── */

const recapInclude = {
  student: { select: { fullName: true, nimNip: true } },
  vacancy: { select: { title: true, lecturer: { select: { fullName: true, nimNip: true } } } },
  assessment: true,
} satisfies Prisma.ApplicationInclude;

/** Rekap nilai seluruh peserta riset aktif/selesai. */
export async function listGradeRecap() {
  const apps = await prisma.application.findMany({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    include: recapInclude,
    orderBy: { coordinatorValidatedAt: "asc" },
  });
  return apps.map((app) => {
    const a = app.assessment;
    const state: GradeState = !a
      ? "NOT_READY"
      : a.isLockedByCoordinator
        ? "LOCKED"
        : app.status === "COMPLETED"
          ? "PUBLISHED"
          : "DRAFT";
    const letter = a ? (a.letterGrade as LetterGrade) : null;
    return {
      app,
      state,
      summary: a ? gradeSummary(Number(a.finalNumericScore)) : null,
      conversion: letter ? gradeConversion(app.conversionScheme, app.includesKpConversion, letter) : null,
    };
  });
}

type BaRow = {
  applicationId: string;
  nim: string;
  studentName: string;
  researchTitle: string;
  lecturerName: string;
  lecturerNip: string;
  scores: RubricScores;
  final: number;
  letter: LetterGrade;
  credits: number;
  recognizedCredits: number;
  conversion: string;
};

function canonicalBa(baNumber: string, rows: BaRow[]) {
  return JSON.stringify({
    v: 1,
    baNumber,
    rows: [...rows]
      .sort((a, b) => a.nim.localeCompare(b.nim))
      .map((r) => ({ id: r.applicationId, nim: r.nim, s: r.scores, f: r.final.toFixed(2), l: r.letter, c: r.recognizedCredits })),
  });
}

async function lockedRows(applicationIds?: string[]): Promise<BaRow[]> {
  const apps = await prisma.application.findMany({
    where: {
      status: "COMPLETED",
      assessment: { isLockedByCoordinator: true },
      ...(applicationIds ? { id: { in: applicationIds } } : {}),
    },
    include: recapInclude,
    orderBy: { student: { nimNip: "asc" } },
  });
  return apps.map((app) => {
    const a = app.assessment!;
    const letter = a.letterGrade as LetterGrade;
    const conv = gradeConversion(app.conversionScheme, app.includesKpConversion, letter);
    return {
      applicationId: app.id,
      nim: app.student.nimNip,
      studentName: app.student.fullName,
      researchTitle: app.vacancy.title,
      lecturerName: app.vacancy.lecturer.fullName,
      lecturerNip: app.vacancy.lecturer.nimNip,
      scores: toScores(a),
      final: Number(a.finalNumericScore),
      letter,
      credits: conv.totalCredits,
      recognizedCredits: conv.recognizedCredits,
      conversion: conv.target,
    };
  });
}

export type BeritaAcaraSnapshot = {
  baNumber: string;
  period: string;
  issuedAt: string;
  issuedBy: { name: string; nip: string };
  code: string;
  rows: BaRow[];
};

/**
 * Kunci seluruh nilai yang sudah terbit (freeze) lalu terbitkan Berita Acara Nilai Resmi
 * mencakup semua nilai terkunci. Mengembalikan ID berita acara (= ID entri audit log).
 */
export async function issueBeritaAcara(coordinator: Pick<CurrentUser, "id" | "fullName" | "nimNip">) {
  const locked = await prisma.gradeAssessment.updateMany({
    where: { isLockedByCoordinator: false, application: { status: "COMPLETED" } },
    data: { isLockedByCoordinator: true },
  });

  const rows = await lockedRows();
  if (rows.length === 0) throw new AssessmentRuleError("Belum ada nilai resmi yang diterbitkan Dosen Peneliti.");

  const issuedAt = new Date();
  const seq = (await prisma.auditLog.count({ where: { actionName: BA_ACTION } })) + 1;
  const baNumber = `BA-NILAI/MB04/${issuedAt.getFullYear()}/${String(seq).padStart(3, "0")}`;
  const snapshot: BeritaAcaraSnapshot = {
    baNumber,
    period: academicPeriod().label,
    issuedAt: issuedAt.toISOString(),
    issuedBy: { name: coordinator.fullName, nip: coordinator.nimNip },
    code: signCode(canonicalBa(baNumber, rows)),
    rows,
  };

  const log = await prisma.auditLog.create({
    data: {
      userId: coordinator.id,
      actionName: BA_ACTION,
      entityName: "grade_assessments",
      entityId: baNumber,
      payloadJson: JSON.stringify(snapshot),
    },
    select: { id: true },
  });
  return { id: log.id, baNumber, newlyLocked: locked.count, rows: rows.length };
}

export async function listBeritaAcara() {
  const logs = await prisma.auditLog.findMany({
    where: { actionName: BA_ACTION },
    orderBy: { createdAt: "desc" },
    select: { id: true, entityId: true, createdAt: true, payloadJson: true },
  });
  return logs.map((l) => ({
    id: l.id,
    baNumber: l.entityId,
    createdAt: l.createdAt,
    rows: (JSON.parse(l.payloadJson ?? "{}") as Partial<BeritaAcaraSnapshot>).rows?.length ?? 0,
  }));
}

/** Muat berita acara + periksa ulang integritasnya terhadap nilai terkini di basis data. */
export async function getBeritaAcara(id: string) {
  const log = await prisma.auditLog.findUnique({ where: { id } });
  if (!log || log.actionName !== BA_ACTION || !log.payloadJson) return null;
  const snapshot = JSON.parse(log.payloadJson) as BeritaAcaraSnapshot;
  const current = await lockedRows(snapshot.rows.map((r) => r.applicationId));
  const intact =
    current.length === snapshot.rows.length && signCode(canonicalBa(snapshot.baNumber, current)) === snapshot.code;
  return { id: log.id, snapshot, intact };
}
