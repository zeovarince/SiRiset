/**
 * Layanan domain Pendaftaran & Seleksi Mahasiswa (FR-03, BR-03, BR-06).
 * Dipakai Server Actions (dasbor) dan Route Handlers /api/applications.
 */
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";
import { ApprovalRuleError, forkApprovals } from "./approvals";
import { checkEligibility, type EligibilityResult } from "./siakad-mock";
import { SELECTION_SLA_WORKING_DAYS, addWorkingDays } from "./sla";
import { deleteStoredFile, savePdf } from "./storage";
import { ACCEPTED_STATUSES } from "./vacancies";
import type { ApplicationInput, DecisionInput } from "./application-schema";

/** Pendaftaran yang masih "hidup" — FR-03.1: maksimal satu per mahasiswa per periode. */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "DOSEN_ACCEPTED",
  "APPROVAL_PENDING",
  "REVISION_REQUIRED",
  "APPROVAL_COMPLETE",
  "IN_PROGRESS",
];

export class ApplicationRuleError extends Error {}

export type BlockReason =
  | { code: "not-eligible" }
  | { code: "already-applied"; applicationId: string; status: ApplicationStatus }
  | { code: "active-elsewhere"; vacancyTitle: string }
  | { code: "vacancy-closed" }
  | { code: "not-started"; startsAt: Date }
  | { code: "quota-full" };

/** Kumpulkan seluruh konteks untuk halaman formulir pendaftaran. */
export async function getApplyContext(student: Pick<CurrentUser, "id" | "nimNip">, vacancyId: string) {
  const vacancy = await prisma.researchVacancy.findUnique({
    where: { id: vacancyId },
    include: { lecturer: { select: { fullName: true, nimNip: true } } },
  });
  if (!vacancy) return null;

  const [eligibility, existing, activeElsewhere, accepted] = await Promise.all([
    checkEligibility(student.nimNip),
    prisma.application.findUnique({
      where: { vacancyId_studentId: { vacancyId, studentId: student.id } },
      select: { id: true, status: true },
    }),
    prisma.application.findFirst({
      where: { studentId: student.id, status: { in: ACTIVE_STATUSES }, vacancyId: { not: vacancyId } },
      select: { vacancy: { select: { title: true } } },
    }),
    prisma.application.count({ where: { vacancyId, status: { in: ACCEPTED_STATUSES } } }),
  ]);

  const now = new Date();
  let block: BlockReason | null = null;
  if (existing) block = { code: "already-applied", applicationId: existing.id, status: existing.status };
  else if (activeElsewhere) block = { code: "active-elsewhere", vacancyTitle: activeElsewhere.vacancy.title };
  else if (vacancy.status !== "PUBLISHED" || vacancy.applicationEndDate < now) block = { code: "vacancy-closed" };
  else if (vacancy.applicationStartDate > now) block = { code: "not-started", startsAt: vacancy.applicationStartDate };
  else if (accepted >= vacancy.quota) block = { code: "quota-full" };
  else if (!eligibility.eligible) block = { code: "not-eligible" };

  return { vacancy, eligibility, block, remainingQuota: Math.max(0, vacancy.quota - accepted) };
}

const BLOCK_MESSAGES: Record<BlockReason["code"], string> = {
  "not-eligible": "Tolak otomatis: prasyarat akademik SIAKAD belum terpenuhi (BR-03).",
  "already-applied": "Anda sudah mendaftar pada lowongan riset ini.",
  "active-elsewhere": "Anda masih memiliki pendaftaran aktif pada riset lain (FR-03.1: satu riset per periode).",
  "vacancy-closed": "Pendaftaran lowongan riset ini sudah ditutup.",
  "not-started": "Pendaftaran lowongan riset ini belum dibuka.",
  "quota-full": "Kuota lowongan riset ini sudah terpenuhi.",
};

export function blockMessage(block: BlockReason): string {
  return BLOCK_MESSAGES[block.code];
}

/**
 * Ajukan pendaftaran satu pintu. Verifikasi SIAKAD dijalankan ulang di server (fail fast),
 * berkas proposal disimpan privat, dan sla_deadline = +7 hari kerja.
 */
export async function submitApplication(params: {
  student: Pick<CurrentUser, "id" | "nimNip">;
  vacancyId: string;
  input: ApplicationInput;
  proposalPdf: Buffer;
}): Promise<{ id: string; slaDeadline: Date; eligibility: Extract<EligibilityResult, { found: true }> }> {
  const ctx = await getApplyContext(params.student, params.vacancyId);
  if (!ctx) throw new ApplicationRuleError("Lowongan riset tidak ditemukan.");
  if (ctx.block) throw new ApplicationRuleError(blockMessage(ctx.block));
  const eligibility = ctx.eligibility;
  if (!eligibility.found || !eligibility.eligible) throw new ApplicationRuleError(blockMessage({ code: "not-eligible" }));

  const fileKey = await savePdf("proposals", params.proposalPdf);
  const now = new Date();
  const slaDeadline = addWorkingDays(now, SELECTION_SLA_WORKING_DAYS);

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Cek ulang di dalam transaksi untuk mencegah race condition (double submit).
      const active = await tx.application.count({
        where: { studentId: params.student.id, status: { in: ACTIVE_STATUSES } },
      });
      if (active > 0) throw new ApplicationRuleError(BLOCK_MESSAGES["active-elsewhere"]);

      return tx.application.create({
        data: {
          vacancyId: params.vacancyId,
          studentId: params.student.id,
          gpaAtApplication: eligibility.record.gpa.toFixed(2),
          mandatoryCoursesPassed: eligibility.mandatory.failed.length === 0,
          proposalTitle: params.input.proposalTitle,
          proposalFileUrl: fileKey,
          conversionScheme: params.input.conversionScheme,
          includesKpConversion: params.input.includesKpConversion,
          status: "SUBMITTED",
          slaDeadline,
        },
        select: { id: true, slaDeadline: true },
      });
    });
    return { ...created, eligibility };
  } catch (err) {
    // Hapus berkas yatim bila penyimpanan data gagal.
    await deleteStoredFile(fileKey);
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      throw new ApplicationRuleError(BLOCK_MESSAGES["already-applied"]);
    }
    throw err;
  }
}

/**
 * Keputusan seleksi Dosen Peneliti (api-spec §4.2).
 * ACCEPT → DOSEN_ACCEPTED (kuota tersisa berkurang 1; lowongan ditutup otomatis bila kuota penuh).
 * REJECT → REJECTED dengan alasan objektif.
 */
export async function decideApplication(params: {
  actor: Pick<CurrentUser, "id" | "activeRole">;
  applicationId: string;
  input: DecisionInput;
}) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: params.applicationId },
      include: { vacancy: true, student: { select: { fullName: true } } },
    });
    if (!app || (app.vacancy.lecturerId !== params.actor.id && params.actor.activeRole !== "ADMIN")) {
      throw new ApplicationRuleError("Pendaftaran tidak ditemukan atau bukan pelamar lowongan Anda.");
    }
    if (app.status !== "SUBMITTED") {
      throw new ApplicationRuleError("Pelamar ini sudah diputuskan sebelumnya.");
    }

    let vacancyClosed = false;
    if (params.input.decision === "ACCEPT") {
      const accepted = await tx.application.count({
        where: { vacancyId: app.vacancyId, status: { in: ACCEPTED_STATUSES } },
      });
      if (accepted >= app.vacancy.quota) {
        throw new ApplicationRuleError(
          `Kuota riset sudah penuh (${accepted}/${app.vacancy.quota}). Tolak pelamar ini atau naikkan kuota lowongan.`,
        );
      }
      if (accepted + 1 >= app.vacancy.quota && app.vacancy.status === "PUBLISHED") {
        await tx.researchVacancy.update({ where: { id: app.vacancyId }, data: { status: "CLOSED" } });
        vacancyClosed = true;
      }
    }

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        status: params.input.decision === "ACCEPT" ? "DOSEN_ACCEPTED" : "REJECTED",
        selectionNotes: params.input.notes ?? null,
        selectionDecidedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    // FR-04.1/04.2 — PARALLEL FORK: buat 3 permintaan e-approval sekaligus (atomik dengan penerimaan).
    if (params.input.decision === "ACCEPT") {
      await forkApprovals(tx, app.id).catch((err) => {
        throw err instanceof ApprovalRuleError ? new ApplicationRuleError(err.message) : err;
      });
    }

    return { ...updated, studentName: app.student.fullName, vacancyId: app.vacancyId, vacancyClosed };
  });
}

/** Hak akses unduh proposal: pemilik, dosen pemilik lowongan, approver, atau peran prodi/LPPM. */
export async function canAccessApplication(user: CurrentUser, applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      studentId: true,
      proposalFileUrl: true,
      student: { select: { nimNip: true } },
      vacancy: { select: { lecturerId: true } },
      approvals: { select: { approverId: true } },
    },
  });
  if (!app) return null;
  const allowed =
    app.studentId === user.id ||
    app.vacancy.lecturerId === user.id ||
    app.approvals.some((a) => a.approverId === user.id) ||
    ["KAPRODI", "KOORDINATOR_MBKM", "LPPM_REVIEWER", "ADMIN"].includes(user.activeRole);
  return allowed ? app : null;
}

/** Pelamar seluruh lowongan milik dosen, dikelompokkan per lowongan. */
export async function listApplicantsForLecturer(lecturerId: string) {
  const vacancies = await prisma.researchVacancy.findMany({
    where: { lecturerId, status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        orderBy: [{ createdAt: "asc" }],
        include: { student: { select: { fullName: true, nimNip: true } } },
      },
    },
  });
  return vacancies.map((v) => {
    const accepted = v.applications.filter((a) => ACCEPTED_STATUSES.includes(a.status)).length;
    return { ...v, accepted, remainingQuota: Math.max(0, v.quota - accepted) };
  });
}

/** Riwayat pendaftaran mahasiswa untuk pelacak status. */
export async function listStudentApplications(studentId: string) {
  return prisma.application.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: {
      vacancy: { include: { lecturer: { select: { fullName: true } } } },
      approvals: { include: { approver: { select: { fullName: true } } } },
    },
  });
}
