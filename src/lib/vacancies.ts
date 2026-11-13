/**
 * Layanan domain Lowongan Riset (FR-02) — query & mutasi server-side.
 * Dipakai oleh halaman dasbor (Server Components/Actions) dan Route Handler /api/vacancies.
 */
import type { ApplicationStatus, Prisma, VacancyStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { daysUntil, endOfDayWIB, startOfDayWIB, todayWIB } from "./format";
import { parseSkills, serializeSkills, type CatalogFilter, type VacancyInput } from "./vacancy-schema";

/** Status pendaftaran yang sudah mengisi kuota (lolos seleksi dosen). */
export const ACCEPTED_STATUSES: ApplicationStatus[] = [
  "DOSEN_ACCEPTED",
  "APPROVAL_PENDING",
  "REVISION_REQUIRED",
  "APPROVAL_COMPLETE",
  "IN_PROGRESS",
  "COMPLETED",
];

export type ApplicationStats = { applicants: number; accepted: number };

/** Statistik pendaftar & yang diterima per lowongan. */
export async function getApplicationStats(vacancyIds: string[]): Promise<Map<string, ApplicationStats>> {
  const stats = new Map<string, ApplicationStats>(vacancyIds.map((id) => [id, { applicants: 0, accepted: 0 }]));
  if (vacancyIds.length === 0) return stats;

  const rows = await prisma.application.groupBy({
    by: ["vacancyId", "status"],
    where: { vacancyId: { in: vacancyIds } },
    _count: { _all: true },
  });
  for (const row of rows) {
    const s = stats.get(row.vacancyId)!;
    s.applicants += row._count._all;
    if (ACCEPTED_STATUSES.includes(row.status)) s.accepted += row._count._all;
  }
  return stats;
}

/**
 * FR-02.2 — tutup otomatis lowongan PUBLISHED yang tenggatnya lewat atau kuotanya terpenuhi.
 * Idempoten; dipanggil sebelum membaca katalog/daftar lowongan.
 */
export async function autoCloseVacancies(): Promise<number> {
  const now = new Date();
  const expired = await prisma.researchVacancy.updateMany({
    where: { status: "PUBLISHED", applicationEndDate: { lt: now } },
    data: { status: "CLOSED" },
  });

  const open = await prisma.researchVacancy.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, quota: true },
  });
  const stats = await getApplicationStats(open.map((v) => v.id));
  const fullIds = open.filter((v) => (stats.get(v.id)?.accepted ?? 0) >= v.quota).map((v) => v.id);
  if (fullIds.length > 0) {
    await prisma.researchVacancy.updateMany({ where: { id: { in: fullIds } }, data: { status: "CLOSED" } });
  }
  return expired.count + fullIds.length;
}

const lecturerSelect = { id: true, fullName: true, nimNip: true } satisfies Prisma.UserSelect;

export type CatalogVacancy = {
  id: string;
  title: string;
  description: string;
  grantContractNumber: string;
  grantScheme: string;
  quota: number;
  enrolledCount: number;
  applicantCount: number;
  remainingQuota: number;
  skills: string[];
  applicationStartDate: Date;
  applicationEndDate: Date;
  daysLeft: number;
  isOpenForApplication: boolean;
  lecturer: { id: string; fullName: string; nimNip: string };
};

/** Katalog lowongan PUBLISHED yang masih dalam periode pendaftaran (US-1.2). */
export async function listCatalog(filter: CatalogFilter = {}): Promise<CatalogVacancy[]> {
  await autoCloseVacancies();

  const where: Prisma.ResearchVacancyWhereInput = {
    status: "PUBLISHED",
    applicationEndDate: { gte: new Date() },
  };
  if (filter.scheme) where.grantScheme = filter.scheme;
  if (filter.q) {
    // SQLite LIKE bersifat case-insensitive untuk karakter ASCII.
    where.OR = [
      { title: { contains: filter.q } },
      { lecturer: { fullName: { contains: filter.q } } },
      { grantContractNumber: { contains: filter.q } },
    ];
  }

  const rows = await prisma.researchVacancy.findMany({
    where,
    include: { lecturer: { select: lecturerSelect } },
    orderBy: [{ applicationEndDate: "asc" }, { createdAt: "desc" }],
  });
  const stats = await getApplicationStats(rows.map((r) => r.id));
  const now = new Date();
  const skillKey = filter.skill?.toLowerCase();

  return rows
    .map((v) => {
      const s = stats.get(v.id)!;
      const remainingQuota = Math.max(0, v.quota - s.accepted);
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        grantContractNumber: v.grantContractNumber,
        grantScheme: v.grantScheme,
        quota: v.quota,
        enrolledCount: s.accepted,
        applicantCount: s.applicants,
        remainingQuota,
        skills: parseSkills(v.requiredSkills),
        applicationStartDate: v.applicationStartDate,
        applicationEndDate: v.applicationEndDate,
        daysLeft: daysUntil(v.applicationEndDate),
        isOpenForApplication: remainingQuota > 0 && v.applicationStartDate <= now,
        lecturer: v.lecturer,
      };
    })
    .filter((v) => !skillKey || v.skills.some((s) => s.toLowerCase() === skillKey));
}

/** Daftar tag keahlian unik dari lowongan yang sedang dibuka (opsi filter). */
export async function listCatalogSkills(): Promise<string[]> {
  const rows = await prisma.researchVacancy.findMany({
    where: { status: "PUBLISHED", applicationEndDate: { gte: new Date() } },
    select: { requiredSkills: true },
  });
  const byKey = new Map<string, string>();
  for (const r of rows) for (const s of parseSkills(r.requiredSkills)) byKey.set(s.toLowerCase(), byKey.get(s.toLowerCase()) ?? s);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "id"));
}

export type LecturerVacancy = Awaited<ReturnType<typeof listLecturerVacancies>>[number];

/** Seluruh lowongan milik dosen beserta statistik pendaftar. */
export async function listLecturerVacancies(lecturerId: string) {
  await autoCloseVacancies();
  const rows = await prisma.researchVacancy.findMany({
    where: { lecturerId },
    orderBy: [{ createdAt: "desc" }],
  });
  const stats = await getApplicationStats(rows.map((r) => r.id));
  return rows.map((v) => {
    const s = stats.get(v.id)!;
    return {
      ...v,
      skills: parseSkills(v.requiredSkills),
      applicantCount: s.applicants,
      acceptedCount: s.accepted,
      remainingQuota: Math.max(0, v.quota - s.accepted),
      daysLeft: daysUntil(v.applicationEndDate),
    };
  });
}

export class VacancyRuleError extends Error {}

function toData(input: VacancyInput) {
  return {
    title: input.title,
    grantContractNumber: input.grantContractNumber,
    grantScheme: input.grantScheme,
    description: input.description,
    quota: input.quota,
    requiredSkills: serializeSkills(input.requiredSkills),
    applicationStartDate: startOfDayWIB(input.applicationStartDate),
    applicationEndDate: endOfDayWIB(input.applicationEndDate),
  };
}

function assertPublishable(input: { applicationEndDate: string }) {
  if (input.applicationEndDate < todayWIB()) {
    throw new VacancyRuleError("Tanggal tutup pendaftaran sudah lewat — lowongan tidak dapat dipublikasikan.");
  }
}

export async function createVacancy(lecturerId: string, input: VacancyInput, status: Extract<VacancyStatus, "DRAFT" | "PUBLISHED">) {
  if (status === "PUBLISHED") assertPublishable(input);
  return prisma.researchVacancy.create({ data: { ...toData(input), lecturerId, status } });
}

/**
 * Perbarui lowongan. `nextStatus` undefined = pertahankan status saat ini.
 * Aturan: kuota tidak boleh di bawah jumlah mahasiswa yang sudah diterima.
 */
export async function updateVacancy(
  vacancyId: string,
  input: VacancyInput,
  nextStatus?: Extract<VacancyStatus, "DRAFT" | "PUBLISHED">,
) {
  const stats = (await getApplicationStats([vacancyId])).get(vacancyId)!;
  if (input.quota < stats.accepted) {
    throw new VacancyRuleError(`Kuota tidak boleh kurang dari ${stats.accepted} mahasiswa yang sudah diterima.`);
  }
  if (nextStatus === "DRAFT" && stats.applicants > 0) {
    throw new VacancyRuleError("Lowongan yang sudah memiliki pendaftar tidak dapat dikembalikan menjadi draf.");
  }
  if (nextStatus === "PUBLISHED") {
    assertPublishable(input);
    if (stats.accepted >= input.quota) {
      throw new VacancyRuleError("Kuota sudah terpenuhi — naikkan kuota terlebih dahulu untuk membuka kembali.");
    }
  }
  return prisma.researchVacancy.update({
    where: { id: vacancyId },
    data: { ...toData(input), ...(nextStatus ? { status: nextStatus } : {}) },
  });
}
