"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit, requireRole } from "@/lib/auth";
import {
  logbookInputSchema,
  logbookReviewSchema,
  type LogbookField,
  type LogbookFormState,
  type LogbookFormValues,
} from "@/lib/logbook-schema";
import { LogbookRuleError, reviewLogbook, saveLogbook } from "@/lib/logbooks";
import { UploadError, readEvidenceUpload } from "@/lib/storage";

const STUDENT = "/dashboard/student/logbook";
const MENTORING = "/dashboard/lecturer/mentoring";

function readValues(formData: FormData): LogbookFormValues {
  const s = (k: string) => String(formData.get(k) ?? "");
  return {
    activityDate: s("activityDate"),
    durationHours: s("durationHours"),
    activityDescription: s("activityDescription"),
    challengesFaced: s("challengesFaced"),
    solutionsImplemented: s("solutionsImplemented"),
    repositoryLink: s("repositoryLink"),
  };
}

/** Mahasiswa: isi / perbaiki logbook minggu tertentu. */
export async function submitLogbookAction(
  applicationId: string,
  week: number,
  prev: LogbookFormState,
  formData: FormData,
): Promise<LogbookFormState> {
  const user = await requireRole("MAHASISWA");
  const nonce = prev.nonce + 1;
  const values = readValues(formData);
  if (!z.string().uuid().safeParse(applicationId).success) return { nonce, values, error: "Riset tidak ditemukan." };

  const fieldErrors: Partial<Record<LogbookField, string>> = {};
  const parsed = logbookInputSchema.safeParse(values);
  if (!parsed.success) for (const i of parsed.error.issues) fieldErrors[i.path[0] as LogbookField] ??= i.message;

  let evidence: Awaited<ReturnType<typeof readEvidenceUpload>> = null;
  try {
    evidence = await readEvidenceUpload(formData.get("evidence"));
  } catch (err) {
    if (!(err instanceof UploadError)) throw err;
    fieldErrors.evidence = err.message;
  }
  if (!parsed.success || fieldErrors.evidence) {
    return { nonce, values, fieldErrors, error: "Periksa kembali isian yang ditandai." };
  }

  let result: Awaited<ReturnType<typeof saveLogbook>>;
  try {
    result = await saveLogbook({ studentId: user.id, applicationId, week, input: parsed.data, evidence });
  } catch (err) {
    if (err instanceof LogbookRuleError) return { nonce, values, error: err.message };
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: result.created ? "LOGBOOK_SUBMIT" : "LOGBOOK_RESUBMIT",
    entityName: "logbooks",
    entityId: result.id,
    payload: { week, isLate: result.isLate, durationHours: parsed.data.durationHours, evidence: Boolean(evidence) },
  });
  revalidatePath(MENTORING);
  redirect(`${STUDENT}?week=${week}&saved=${result.created ? (result.isLate ? "late" : "created") : "updated"}`);
}

/** Dosen Peneliti: validasi atau minta revisi + catatan bimbingan inline. */
export async function reviewLogbookAction(formData: FormData) {
  const user = await requireRole("DOSEN_PENELITI");
  const logbookId = String(formData.get("logbookId") ?? "");
  const appId = String(formData.get("applicationId") ?? "");
  const week = String(formData.get("week") ?? "");
  const back = (q: string): never => redirect(`${MENTORING}?student=${encodeURIComponent(appId)}&week=${encodeURIComponent(week)}&${q}`);

  if (!z.string().uuid().safeParse(logbookId).success) back(`error=${encodeURIComponent("Logbook tidak ditemukan.")}`);
  const parsed = logbookReviewSchema.safeParse({
    reviewStatus: formData.get("reviewStatus"),
    feedbackNotes: formData.get("feedbackNotes") || undefined,
  });
  if (!parsed.success) back(`error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Input tidak valid.")}`);

  try {
    await reviewLogbook({ lecturer: user, logbookId, input: parsed.data! });
  } catch (err) {
    if (err instanceof LogbookRuleError) back(`error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: parsed.data!.reviewStatus === "APPROVED" ? "LOGBOOK_VALIDATE" : "LOGBOOK_REQUEST_REVISION",
    entityName: "logbooks",
    entityId: logbookId,
    payload: { week: Number(week), feedbackNotes: parsed.data!.feedbackNotes ?? null },
  });
  revalidatePath(STUDENT);
  back(`reviewed=${parsed.data!.reviewStatus}`);
}
