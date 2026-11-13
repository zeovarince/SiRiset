"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit, requireRole } from "@/lib/auth";
import { MonevRuleError, evaluateReport, submitProgressReport } from "@/lib/monev";
import {
  monevEvaluationSchema,
  progressReportSchema,
  type MonevEvaluationField,
  type MonevEvaluationFormState,
  type ProgressReportField,
  type ProgressReportFormState,
} from "@/lib/monev-schema";
import { UploadError, readPdfUpload } from "@/lib/storage";

/** Mahasiswa: unggah / perbarui Laporan Kemajuan (minggu ke-8). */
export async function submitProgressReportAction(
  applicationId: string,
  prev: ProgressReportFormState,
  formData: FormData,
): Promise<ProgressReportFormState> {
  const user = await requireRole("MAHASISWA");
  const nonce = prev.nonce + 1;
  const values = {
    reportTitle: String(formData.get("reportTitle") ?? ""),
    researchProgressSummary: String(formData.get("researchProgressSummary") ?? ""),
    estimatedPercentage: String(formData.get("estimatedPercentage") ?? ""),
  };
  if (!z.string().uuid().safeParse(applicationId).success) return { nonce, values, error: "Riset tidak ditemukan." };

  const fieldErrors: Partial<Record<ProgressReportField, string>> = {};
  const parsed = progressReportSchema.safeParse(values);
  if (!parsed.success) for (const i of parsed.error.issues) fieldErrors[i.path[0] as ProgressReportField] ??= i.message;

  // Berkas PDF opsional saat memperbarui laporan yang sudah ada.
  let pdf: Buffer | null = null;
  const file = formData.get("reportFile");
  if (file instanceof File && file.size > 0) {
    try {
      pdf = await readPdfUpload(file, "Laporan kemajuan");
    } catch (err) {
      if (!(err instanceof UploadError)) throw err;
      fieldErrors.reportFile = err.message;
    }
  }
  if (!parsed.success || fieldErrors.reportFile) return { nonce, values, fieldErrors, error: "Periksa kembali isian yang ditandai." };

  let result: Awaited<ReturnType<typeof submitProgressReport>>;
  try {
    result = await submitProgressReport({ studentId: user.id, applicationId, input: parsed.data, pdf });
  } catch (err) {
    if (err instanceof MonevRuleError) return { nonce, values, error: err.message };
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: result.created ? "PROGRESS_REPORT_SUBMIT" : "PROGRESS_REPORT_UPDATE",
    entityName: "progress_reports",
    entityId: result.id,
    payload: { estimatedPercentage: parsed.data.estimatedPercentage, newFile: Boolean(pdf) },
  });
  revalidatePath("/dashboard/lppm/monev-session");
  redirect(`/dashboard/student/monev?saved=${result.created ? "created" : "updated"}`);
}

/** Reviewer LPPM: simpan penilaian sesi monev. */
export async function evaluateReportAction(
  reportId: string,
  prev: MonevEvaluationFormState,
  formData: FormData,
): Promise<MonevEvaluationFormState> {
  const user = await requireRole("LPPM_REVIEWER");
  const nonce = prev.nonce + 1;
  const values = {
    scoreProgress: String(formData.get("scoreProgress") ?? ""),
    scoreMethodology: String(formData.get("scoreMethodology") ?? ""),
    evaluationNotes: String(formData.get("evaluationNotes") ?? ""),
    improvementRecommendations: String(formData.get("improvementRecommendations") ?? ""),
  };
  if (!z.string().uuid().safeParse(reportId).success) return { nonce, values, error: "Laporan tidak ditemukan." };

  const parsed = monevEvaluationSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<MonevEvaluationField, string>> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path[0] as MonevEvaluationField] ??= i.message;
    return { nonce, values, fieldErrors, error: "Periksa kembali isian yang ditandai." };
  }

  let result: Awaited<ReturnType<typeof evaluateReport>>;
  try {
    result = await evaluateReport({ reviewer: user, reportId, input: parsed.data });
  } catch (err) {
    if (err instanceof MonevRuleError) return { nonce, values, error: err.message };
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: "MONEV_EVALUATE",
    entityName: "monev_evaluations",
    entityId: result.id,
    payload: { reportId, ...parsed.data, average: result.grade.average, majorRevision: result.grade.majorRevision },
  });
  revalidatePath("/dashboard/student/monev");
  revalidatePath("/dashboard/lecturer/mentoring");
  redirect(`/dashboard/lppm/monev-session?report=${reportId}&evaluated=1`);
}
