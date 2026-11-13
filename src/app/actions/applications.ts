"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit, requireRole } from "@/lib/auth";
import {
  applicationInputSchema,
  decisionSchema,
  type ApplicationField,
  type ApplyFormState,
} from "@/lib/application-schema";
import { ApplicationRuleError, decideApplication, submitApplication } from "@/lib/applications";
import { UploadError, readPdfUpload } from "@/lib/storage";

const uuid = z.string().uuid();

/** Mahasiswa: kirim formulir pendaftaran satu pintu (FR-03). */
export async function submitApplicationAction(
  vacancyId: string,
  prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const user = await requireRole("MAHASISWA");
  const nonce = prev.nonce + 1;
  const values = {
    proposalTitle: String(formData.get("proposalTitle") ?? ""),
    conversionScheme: String(formData.get("conversionScheme") ?? ""),
    includesKpConversion: formData.get("includesKpConversion") === "on",
  };
  if (!uuid.safeParse(vacancyId).success) return { nonce, values, error: "Lowongan riset tidak ditemukan." };

  const fieldErrors: Partial<Record<ApplicationField, string>> = {};
  const parsed = applicationInputSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as ApplicationField] ??= issue.message;
  }

  let pdf: Buffer | null = null;
  try {
    pdf = await readPdfUpload(formData.get("proposal"), "Proposal ringkas");
  } catch (err) {
    if (!(err instanceof UploadError)) throw err;
    fieldErrors.proposal = err.message;
  }

  if (!parsed.success || !pdf) {
    return { nonce, values, fieldErrors, error: "Periksa kembali isian yang ditandai." };
  }

  let result;
  try {
    result = await submitApplication({ student: user, vacancyId, input: parsed.data, proposalPdf: pdf });
  } catch (err) {
    if (err instanceof ApplicationRuleError) return { nonce, values, error: err.message };
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: "APPLICATION_SUBMIT",
    entityName: "applications",
    entityId: result.id,
    payload: {
      vacancyId,
      ...parsed.data,
      siakad: { gpa: result.eligibility.record.gpa, mandatoryPercent: result.eligibility.mandatory.percent },
      slaDeadline: result.slaDeadline.toISOString(),
    },
  });

  revalidatePath("/dashboard/student/vacancies");
  revalidatePath("/dashboard/lecturer/applicants");
  redirect(`/dashboard/student/tracker?submitted=${result.id}`);
}

/** Dosen Peneliti: terima / tolak pelamar (api-spec §4.2). */
export async function decideApplicationAction(formData: FormData) {
  const user = await requireRole("DOSEN_PENELITI");
  const applicationId = String(formData.get("applicationId") ?? "");
  const back = (q: string) => {
    const vacancy = formData.get("vacancyFilter");
    const vq = typeof vacancy === "string" && uuid.safeParse(vacancy).success ? `vacancy=${vacancy}&` : "";
    redirect(`/dashboard/lecturer/applicants?${vq}${q}`);
  };

  if (!uuid.safeParse(applicationId).success) back("error=" + encodeURIComponent("Pendaftaran tidak ditemukan."));
  const parsed = decisionSchema.safeParse({
    decision: formData.get("decision"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) back("error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Input tidak valid."));
  const input = parsed.data!;

  let result;
  try {
    result = await decideApplication({ actor: user, applicationId, input });
  } catch (err) {
    if (err instanceof ApplicationRuleError) back("error=" + encodeURIComponent(err.message));
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: input.decision === "ACCEPT" ? "APPLICATION_ACCEPT" : "APPLICATION_REJECT",
    entityName: "applications",
    entityId: result!.id,
    payload: { notes: input.notes ?? null, vacancyClosed: result!.vacancyClosed },
  });

  revalidatePath("/dashboard/lecturer/vacancies");
  revalidatePath("/dashboard/student/vacancies");
  revalidatePath("/dashboard/student/tracker");
  back(
    `decided=${input.decision === "ACCEPT" ? "accepted" : "rejected"}&name=${encodeURIComponent(result!.studentName)}` +
      (result!.vacancyClosed ? "&closed=1" : ""),
  );
}
