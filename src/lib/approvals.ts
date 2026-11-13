/**
 * Mesin E-Approval Paralel (FR-04) — pola BPMN Parallel Fork / Join.
 *
 * FORK : saat pelamar DOSEN_ACCEPTED → buat 3 baris application_approvals (PENDING)
 *        untuk DOSEN_WALI, DOSEN_PENELITI, KAPRODI secara bersamaan.
 * JOIN : • satu pihak REJECTED          → aplikasi REVISION_REQUIRED (catatan tampil di akun mahasiswa)
 *        • ketiga pihak APPROVED        → aplikasi APPROVAL_COMPLETE (antrean validasi Koordinator)
 *        • sebagian APPROVED, sisanya PENDING → APPROVAL_PENDING
 */
import type { ApplicationStatus, ApprovalRole, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";
import type { Role } from "./roles";

type Tx = Prisma.TransactionClient;

export const APPROVAL_ROLES: ApprovalRole[] = ["DOSEN_WALI", "DOSEN_PENELITI", "KAPRODI"];

/** Status aplikasi yang sedang dalam fase e-approval (approver boleh memutuskan). */
export const APPROVAL_OPEN_STATUSES: ApplicationStatus[] = ["DOSEN_ACCEPTED", "APPROVAL_PENDING"];

/** Status setelah join berhasil — lembar pengesahan digital sudah terbit. */
export const APPROVED_STATUSES: ApplicationStatus[] = ["APPROVAL_COMPLETE", "IN_PROGRESS", "COMPLETED"];

export const APPROVAL_ROLE_LABELS: Record<ApprovalRole, string> = {
  DOSEN_WALI: "Dosen Wali",
  DOSEN_PENELITI: "Dosen Peneliti",
  KAPRODI: "Kaprodi",
};

/** Fokus penilaian tiap approver (PRD FR-04.2). */
export const APPROVAL_ROLE_FOCUS: Record<ApprovalRole, string> = {
  DOSEN_WALI: "Kelayakan studi & konversi SKS",
  DOSEN_PENELITI: "Rencana kerja riset",
  KAPRODI: "Pemenuhan capaian pembelajaran prodi",
};

export function isApprovalRole(role: Role): role is ApprovalRole {
  return (APPROVAL_ROLES as string[]).includes(role);
}

export class ApprovalRuleError extends Error {}

async function firstUserWithRole(tx: Tx, role: Role) {
  const u = await tx.user.findFirst({
    where: { isActive: true, roles: { some: { roleCode: role } } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return u?.id ?? null;
}

/** Tentukan 3 approver: Dosen Wali mahasiswa, Dosen Peneliti pemilik lowongan, dan Kaprodi. */
async function resolveApprovers(tx: Tx, applicationId: string): Promise<Record<ApprovalRole, string>> {
  const app = await tx.application.findUniqueOrThrow({
    where: { id: applicationId },
    select: {
      vacancy: { select: { lecturerId: true } },
      student: {
        select: {
          academicAdvisor: { select: { id: true, isActive: true, roles: { select: { roleCode: true } } } },
        },
      },
    },
  });

  const advisor = app.student.academicAdvisor;
  const wali =
    advisor && advisor.isActive && advisor.roles.some((r) => r.roleCode === "DOSEN_WALI")
      ? advisor.id
      : await firstUserWithRole(tx, "DOSEN_WALI");
  const kaprodi = await firstUserWithRole(tx, "KAPRODI");

  if (!wali) throw new ApprovalRuleError("Dosen Wali mahasiswa belum terdaftar di sistem — hubungi admin prodi.");
  if (!kaprodi) throw new ApprovalRuleError("Akun Kaprodi belum terdaftar di sistem — hubungi admin prodi.");

  return { DOSEN_WALI: wali, DOSEN_PENELITI: app.vacancy.lecturerId, KAPRODI: kaprodi };
}

/** PARALLEL FORK — buat (atau lengkapi) 3 baris approval PENDING. Idempoten. */
export async function forkApprovals(tx: Tx, applicationId: string) {
  const approvers = await resolveApprovers(tx, applicationId);
  for (const role of APPROVAL_ROLES) {
    await tx.applicationApproval.upsert({
      where: { applicationId_approverRole: { applicationId, approverRole: role } },
      update: {},
      create: { applicationId, approverRole: role, approverId: approvers[role], status: "PENDING" },
    });
  }
}

/**
 * Lengkapi fork untuk pendaftaran DOSEN_ACCEPTED yang belum memiliki 3 baris approval
 * (mis. diterima sebelum modul Fase 3 aktif). Idempoten, dipanggil sebelum membaca antrean.
 */
export async function backfillApprovalForks() {
  const missing = await prisma.application.findMany({
    where: { status: "DOSEN_ACCEPTED" },
    select: { id: true, _count: { select: { approvals: true } } },
  });
  for (const app of missing.filter((a) => a._count.approvals < APPROVAL_ROLES.length)) {
    await prisma.$transaction((tx) => forkApprovals(tx, app.id)).catch((err) => {
      console.error(`[approvals] fork gagal untuk aplikasi ${app.id}:`, err);
    });
  }
}

/** PARALLEL JOIN — hitung status aplikasi dari ketiga keputusan. */
export function joinStatus(statuses: { status: string }[]): ApplicationStatus {
  if (statuses.some((s) => s.status === "REJECTED")) return "REVISION_REQUIRED";
  if (statuses.length === APPROVAL_ROLES.length && statuses.every((s) => s.status === "APPROVED")) {
    return "APPROVAL_COMPLETE";
  }
  return statuses.some((s) => s.status === "APPROVED") ? "APPROVAL_PENDING" : "DOSEN_ACCEPTED";
}

const queueInclude = {
  application: {
    include: {
      student: { select: { fullName: true, nimNip: true } },
      vacancy: { select: { title: true, grantContractNumber: true, lecturer: { select: { fullName: true } } } },
      approvals: { include: { approver: { select: { fullName: true } } } },
    },
  },
} satisfies Prisma.ApplicationApprovalInclude;

/** Filter antrean: approval PENDING milik user pada konteks peran aktifnya. */
function queueWhere(userId: string, role: ApprovalRole): Prisma.ApplicationApprovalWhereInput {
  return {
    approverId: userId,
    approverRole: role,
    status: "PENDING",
    application: { status: { in: APPROVAL_OPEN_STATUSES } },
  };
}

export async function listPendingApprovals(user: Pick<CurrentUser, "id" | "activeRole">) {
  if (!isApprovalRole(user.activeRole)) return [];
  await backfillApprovalForks();
  return prisma.applicationApproval.findMany({
    where: queueWhere(user.id, user.activeRole),
    include: queueInclude,
    orderBy: { application: { selectionDecidedAt: "asc" } },
  });
}

export async function countPendingApprovals(user: Pick<CurrentUser, "id" | "activeRole">) {
  if (!isApprovalRole(user.activeRole)) return 0;
  await backfillApprovalForks();
  return prisma.applicationApproval.count({ where: queueWhere(user.id, user.activeRole) });
}

/** Jumlah antrean milik user pada peran approval lain (untuk petunjuk ganti peran). */
export async function pendingInOtherRoles(user: Pick<CurrentUser, "id" | "activeRole" | "roles">) {
  const others = user.roles.filter((r) => isApprovalRole(r) && r !== user.activeRole) as ApprovalRole[];
  const counts = await Promise.all(
    others.map(async (role) => ({ role, count: await prisma.applicationApproval.count({ where: queueWhere(user.id, role) }) })),
  );
  return counts.filter((c) => c.count > 0);
}

export async function listDecidedApprovals(user: Pick<CurrentUser, "id" | "activeRole">, take = 20) {
  if (!isApprovalRole(user.activeRole)) return [];
  return prisma.applicationApproval.findMany({
    where: { approverId: user.id, approverRole: user.activeRole, status: { not: "PENDING" } },
    include: queueInclude,
    orderBy: { decidedAt: "desc" },
    take,
  });
}

export type ApprovalAction = "APPROVE" | "REJECT";

/**
 * Putuskan satu approval (One-Click). Aturan:
 * - hanya approver yang ditunjuk, pada konteks peran yang sesuai;
 * - approval harus PENDING dan aplikasi masih dalam fase e-approval;
 * - REJECT wajib menyertakan catatan revisi.
 * Update approval dilakukan lebih dulu, baru JOIN dibaca — sehingga keputusan paralel
 * yang tiba bersamaan diserialisasi oleh basis data dan join selalu melihat data terbaru.
 */
export async function decideApproval(params: {
  actor: Pick<CurrentUser, "id" | "activeRole">;
  approvalId: string;
  action: ApprovalAction;
  notes?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const approval = await tx.applicationApproval.findUnique({
      where: { id: params.approvalId },
      include: { application: { select: { id: true, status: true, student: { select: { fullName: true } } } } },
    });
    if (!approval || approval.approverId !== params.actor.id || approval.approverRole !== params.actor.activeRole) {
      throw new ApprovalRuleError("Berkas tidak ditemukan pada antrean e-approval peran aktif Anda.");
    }
    if (approval.status !== "PENDING") throw new ApprovalRuleError("Anda sudah memberikan keputusan untuk berkas ini.");
    if (!APPROVAL_OPEN_STATUSES.includes(approval.application.status)) {
      throw new ApprovalRuleError(
        approval.application.status === "REVISION_REQUIRED"
          ? "Berkas sedang dikembalikan ke mahasiswa untuk revisi."
          : "Berkas ini tidak lagi berada pada tahap e-approval.",
      );
    }
    if (params.action === "REJECT" && (params.notes?.trim().length ?? 0) < 10) {
      throw new ApprovalRuleError("Catatan revisi wajib diisi (minimal 10 karakter).");
    }

    await tx.applicationApproval.update({
      where: { id: approval.id },
      data: {
        status: params.action === "APPROVE" ? "APPROVED" : "REJECTED",
        notes: params.notes?.trim() || null,
        decidedAt: new Date(),
      },
    });

    const all = await tx.applicationApproval.findMany({
      where: { applicationId: approval.applicationId },
      select: { status: true },
    });
    const nextStatus = joinStatus(all);
    if (nextStatus !== approval.application.status) {
      await tx.application.update({ where: { id: approval.applicationId }, data: { status: nextStatus } });
    }

    return {
      applicationId: approval.applicationId,
      applicationStatus: nextStatus,
      studentName: approval.application.student.fullName,
      approvedCount: all.filter((a) => a.status === "APPROVED").length,
    };
  });

  // Join selesai → bekukan kode stempel QR sebagai acuan integritas (dipakai validasi Koordinator).
  if (result.applicationStatus === "APPROVAL_COMPLETE") {
    const { freezeCertificateCode } = await import("./approval-certificate");
    await freezeCertificateCode(result.applicationId);
  }
  return result;
}

/**
 * Mahasiswa mengirim ulang berkas setelah REVISION_REQUIRED.
 * Seluruh 3 approval di-reset ke PENDING karena isi dokumen berubah — persetujuan lama
 * tidak boleh melekat pada versi dokumen yang berbeda (integritas stempel QR).
 */
export async function resubmitRevision(params: {
  studentId: string;
  applicationId: string;
  data: { proposalTitle: string; includesKpConversion: boolean; proposalFileUrl?: string };
}) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: params.applicationId },
      select: { id: true, studentId: true, status: true, proposalFileUrl: true },
    });
    if (!app || app.studentId !== params.studentId) throw new ApprovalRuleError("Pendaftaran tidak ditemukan.");
    if (app.status !== "REVISION_REQUIRED") throw new ApprovalRuleError("Pendaftaran ini tidak sedang menunggu revisi.");

    await tx.application.update({
      where: { id: app.id },
      data: {
        proposalTitle: params.data.proposalTitle,
        includesKpConversion: params.data.includesKpConversion,
        ...(params.data.proposalFileUrl ? { proposalFileUrl: params.data.proposalFileUrl } : {}),
        status: "DOSEN_ACCEPTED",
      },
    });
    await tx.applicationApproval.updateMany({
      where: { applicationId: app.id },
      data: { status: "PENDING", notes: null, decidedAt: null },
    });
  });
}
