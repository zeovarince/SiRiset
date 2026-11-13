"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AssessmentRuleError, issueBeritaAcara, saveAssessment } from "@/lib/assessments";
import { recordAudit, requireRole } from "@/lib/auth";
import {
  assessmentInputSchema,
  outputInputSchema,
  type AssessmentFormState,
  type OutputField,
  type OutputFormState,
} from "@/lib/grading-schema";
import { OutputRuleError, createOutput, deleteOutput, verifyOutput } from "@/lib/outputs";
import { UploadError, readEvidenceUpload } from "@/lib/storage";

const uuid = z.string().uuid();
const OUTPUTS = "/dashboard/student/outputs";
const GRADING = "/dashboard/lecturer/grading";
const RECAP = "/dashboard/coordinator/grade-conversion";

/* ───────────── Mahasiswa: luaran riset ───────────── */

export async function createOutputAction(applicationId: string, prev: OutputFormState, formData: FormData): Promise<OutputFormState> {
  const user = await requireRole("MAHASISWA");
  const nonce = prev.nonce + 1;
  const values = {
    outputType: String(formData.get("outputType") ?? ""),
    title: String(formData.get("title") ?? ""),
    targetPublicationName: String(formData.get("targetPublicationName") ?? ""),
    publicationStatus: String(formData.get("publicationStatus") ?? ""),
    demoLink: String(formData.get("demoLink") ?? ""),
  };
  if (!uuid.safeParse(applicationId).success) return { nonce, values, error: "Riset tidak ditemukan." };

  const fieldErrors: Partial<Record<OutputField, string>> = {};
  const parsed = outputInputSchema.safeParse(values);
  if (!parsed.success) for (const i of parsed.error.issues) fieldErrors[i.path[0] as OutputField] ??= i.message;
  let document: Awaited<ReturnType<typeof readEvidenceUpload>> = null;
  try {
    document = await readEvidenceUpload(formData.get("document"), "Berkas luaran");
  } catch (err) {
    if (!(err instanceof UploadError)) throw err;
    fieldErrors.document = err.message;
  }
  if (!parsed.success || fieldErrors.document) return { nonce, values, fieldErrors, error: "Periksa kembali isian yang ditandai." };

  let created: { id: string };
  try {
    created = await createOutput({ studentId: user.id, applicationId, input: parsed.data, document });
  } catch (err) {
    if (err instanceof OutputRuleError) return { nonce, values, error: err.message };
    throw err;
  }
  await recordAudit({
    userId: user.id,
    action: "OUTPUT_CREATE",
    entityName: "research_outputs",
    entityId: created.id,
    payload: { ...parsed.data, document: Boolean(document) },
  });
  revalidatePath(GRADING);
  redirect(`${OUTPUTS}?saved=created`);
}

export async function deleteOutputAction(outputId: string) {
  const user = await requireRole("MAHASISWA");
  if (!uuid.safeParse(outputId).success) redirect(`${OUTPUTS}?error=${encodeURIComponent("Luaran tidak ditemukan.")}`);
  try {
    await deleteOutput(user.id, outputId);
  } catch (err) {
    if (err instanceof OutputRuleError) redirect(`${OUTPUTS}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  await recordAudit({ userId: user.id, action: "OUTPUT_DELETE", entityName: "research_outputs", entityId: outputId });
  revalidatePath(GRADING);
  redirect(`${OUTPUTS}?saved=deleted`);
}

/* ───────────── Dosen Peneliti: verifikasi luaran & penilaian rubrik ───────────── */

export async function verifyOutputAction(formData: FormData) {
  const user = await requireRole("DOSEN_PENELITI");
  const outputId = String(formData.get("outputId") ?? "");
  const student = String(formData.get("applicationId") ?? "");
  const back = (q: string): never => redirect(`${GRADING}?student=${encodeURIComponent(student)}&${q}`);
  if (!uuid.safeParse(outputId).success) back(`error=${encodeURIComponent("Luaran tidak ditemukan.")}`);

  let result: Awaited<ReturnType<typeof verifyOutput>>;
  try {
    result = await verifyOutput(user, outputId);
  } catch (err) {
    if (err instanceof OutputRuleError) back(`error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  await recordAudit({ userId: user.id, action: "OUTPUT_VERIFY", entityName: "research_outputs", entityId: outputId, payload: { title: result!.title } });
  revalidatePath(OUTPUTS);
  back("verified=1");
}

export async function saveAssessmentAction(applicationId: string, prev: AssessmentFormState, formData: FormData): Promise<AssessmentFormState> {
  const user = await requireRole("DOSEN_PENELITI");
  const nonce = prev.nonce + 1;
  const publish = formData.get("intent") === "publish";
  if (!uuid.safeParse(applicationId).success) return { nonce, error: "Mahasiswa tidak ditemukan." };

  const parsed = assessmentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: AssessmentFormState["fieldErrors"] = {};
    for (const i of parsed.error.issues) fieldErrors[i.path[0] as keyof typeof fieldErrors] ??= i.message;
    return { nonce, fieldErrors, error: "Periksa kembali skor yang ditandai." };
  }

  let result: Awaited<ReturnType<typeof saveAssessment>>;
  try {
    result = await saveAssessment({ lecturer: user, applicationId, input: parsed.data, publish });
  } catch (err) {
    if (err instanceof AssessmentRuleError) return { nonce, error: err.message };
    throw err;
  }
  await recordAudit({
    userId: user.id,
    action: publish ? "GRADE_PUBLISH" : "GRADE_DRAFT",
    entityName: "grade_assessments",
    entityId: applicationId,
    payload: { ...parsed.data, finalNumericScore: result.finalNumericScore, letterGrade: result.letterGrade },
  });
  revalidatePath(RECAP);
  revalidatePath(OUTPUTS);
  redirect(`${GRADING}?student=${applicationId}&saved=${publish ? "published" : "draft"}`);
}

/* ───────────── Koordinator MBKM: kunci nilai & berita acara ───────────── */

export async function issueBeritaAcaraAction() {
  const user = await requireRole("KOORDINATOR_MBKM");
  let result: Awaited<ReturnType<typeof issueBeritaAcara>>;
  try {
    result = await issueBeritaAcara(user);
  } catch (err) {
    if (err instanceof AssessmentRuleError) redirect(`${RECAP}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath(GRADING);
  redirect(`${RECAP}/berita-acara/${result!.id}?issued=1&locked=${result!.newlyLocked}`);
}
