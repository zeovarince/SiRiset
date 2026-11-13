"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit, requireRole, type CurrentUser } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  VacancyRuleError,
  createVacancy,
  getApplicationStats,
  updateVacancy,
} from "@/lib/vacancies";
import {
  vacancyInputSchema,
  vacancyIntentSchema,
  type VacancyField,
  type VacancyFormState,
  type VacancyFormValues,
} from "@/lib/vacancy-schema";

const BASE = "/dashboard/lecturer/vacancies";

function readForm(formData: FormData): VacancyFormValues {
  const str = (k: string) => String(formData.get(k) ?? "");
  return {
    title: str("title"),
    grantContractNumber: str("grantContractNumber"),
    grantScheme: str("grantScheme"),
    description: str("description"),
    quota: str("quota"),
    requiredSkills: formData.getAll("requiredSkills").map(String),
    applicationStartDate: str("applicationStartDate"),
    applicationEndDate: str("applicationEndDate"),
  };
}

/** Ambil lowongan & pastikan milik dosen yang login (ADMIN boleh semua). */
async function loadOwnedVacancy(user: CurrentUser, vacancyId: string) {
  const vacancy = await prisma.researchVacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy || (vacancy.lecturerId !== user.id && user.activeRole !== "ADMIN")) return null;
  return vacancy;
}

/** Simpan formulir lowongan (buat baru atau edit) — dipakai dengan useActionState. */
export async function saveVacancyAction(prev: VacancyFormState, formData: FormData): Promise<VacancyFormState> {
  const user = await requireRole("DOSEN_PENELITI");
  const values = readForm(formData);
  const nonce = prev.nonce + 1;
  const vacancyId = formData.get("vacancyId");
  const intent = vacancyIntentSchema.safeParse(formData.get("intent"));
  if (!intent.success) return { nonce, values, error: "Aksi formulir tidak dikenali." };

  const parsed = vacancyInputSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<VacancyField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as VacancyField;
      fieldErrors[key] ??= issue.message;
    }
    return { nonce, values, fieldErrors, error: "Periksa kembali isian yang ditandai." };
  }

  try {
    if (typeof vacancyId === "string" && vacancyId) {
      const existing = await loadOwnedVacancy(user, vacancyId);
      if (!existing) return { nonce, values, error: "Lowongan tidak ditemukan atau bukan milik Anda." };
      const nextStatus = intent.data === "save" ? undefined : intent.data === "publish" ? "PUBLISHED" : "DRAFT";
      await updateVacancy(existing.id, parsed.data, nextStatus);
      await recordAudit({
        userId: user.id,
        action: "VACANCY_UPDATE",
        entityName: "research_vacancies",
        entityId: existing.id,
        payload: { ...parsed.data, status: nextStatus ?? existing.status },
      });
    } else {
      if (intent.data === "save") return { nonce, values, error: "Aksi formulir tidak dikenali." };
      const status = intent.data === "publish" ? "PUBLISHED" : "DRAFT";
      const created = await createVacancy(user.id, parsed.data, status);
      await recordAudit({
        userId: user.id,
        action: "VACANCY_CREATE",
        entityName: "research_vacancies",
        entityId: created.id,
        payload: { ...parsed.data, status },
      });
    }
  } catch (err) {
    if (err instanceof VacancyRuleError) return { nonce, values, error: err.message };
    throw err;
  }

  revalidatePath(BASE);
  revalidatePath("/dashboard/student/vacancies");
  const saved = typeof vacancyId === "string" && vacancyId ? "updated" : intent.data === "draft" ? "draft" : "published";
  redirect(`${BASE}?saved=${saved}`);
}

const idSchema = z.string().uuid();

function fail(code: string): never {
  redirect(`${BASE}?error=${code}`);
}

/** Tutup pendaftaran lowongan (PUBLISHED → CLOSED). */
export async function closeVacancyAction(vacancyId: string) {
  const user = await requireRole("DOSEN_PENELITI");
  if (!idSchema.safeParse(vacancyId).success) fail("not-found");
  const vacancy = await loadOwnedVacancy(user, vacancyId);
  if (!vacancy) fail("not-found");
  if (vacancy.status !== "PUBLISHED") fail("invalid-status");

  await prisma.researchVacancy.update({ where: { id: vacancy.id }, data: { status: "CLOSED" } });
  await recordAudit({
    userId: user.id,
    action: "VACANCY_CLOSE",
    entityName: "research_vacancies",
    entityId: vacancy.id,
  });
  revalidatePath("/dashboard/student/vacancies");
  redirect(`${BASE}?saved=closed`);
}

/** Publikasikan draf atau buka kembali lowongan yang ditutup. */
export async function publishVacancyAction(vacancyId: string) {
  const user = await requireRole("DOSEN_PENELITI");
  if (!idSchema.safeParse(vacancyId).success) fail("not-found");
  const vacancy = await loadOwnedVacancy(user, vacancyId);
  if (!vacancy) fail("not-found");
  if (vacancy.status !== "DRAFT" && vacancy.status !== "CLOSED") fail("invalid-status");
  if (vacancy.applicationEndDate < new Date()) fail("expired");
  const stats = (await getApplicationStats([vacancy.id])).get(vacancy.id)!;
  if (stats.accepted >= vacancy.quota) fail("quota-full");

  await prisma.researchVacancy.update({ where: { id: vacancy.id }, data: { status: "PUBLISHED" } });
  await recordAudit({
    userId: user.id,
    action: "VACANCY_PUBLISH",
    entityName: "research_vacancies",
    entityId: vacancy.id,
    payload: { from: vacancy.status, applicationEndDate: toDateInputValue(vacancy.applicationEndDate) },
  });
  revalidatePath("/dashboard/student/vacancies");
  redirect(`${BASE}?saved=published`);
}

/** Hapus draf yang belum memiliki pendaftar. */
export async function deleteVacancyAction(vacancyId: string) {
  const user = await requireRole("DOSEN_PENELITI");
  if (!idSchema.safeParse(vacancyId).success) fail("not-found");
  const vacancy = await loadOwnedVacancy(user, vacancyId);
  if (!vacancy) fail("not-found");
  if (vacancy.status !== "DRAFT") fail("invalid-status");
  const stats = (await getApplicationStats([vacancy.id])).get(vacancy.id)!;
  if (stats.applicants > 0) fail("has-applicants");

  await prisma.researchVacancy.delete({ where: { id: vacancy.id } });
  await recordAudit({
    userId: user.id,
    action: "VACANCY_DELETE",
    entityName: "research_vacancies",
    entityId: vacancy.id,
    payload: { title: vacancy.title },
  });
  redirect(`${BASE}?saved=deleted`);
}
