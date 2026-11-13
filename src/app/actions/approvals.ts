"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { applicationInputSchema } from "@/lib/application-schema";
import { ApprovalRuleError, decideApproval, resubmitRevision } from "@/lib/approvals";
import { recordAudit, requireRole } from "@/lib/auth";
import { UploadError, deleteStoredFile, readPdfUpload, savePdf } from "@/lib/storage";

const decideSchema = z.object({
  approvalId: z.string().uuid("Berkas tidak ditemukan."),
  action: z.enum(["APPROVE", "REJECT"], { errorMap: () => ({ message: "Aksi tidak dikenali." }) }),
  notes: z.string().trim().max(1000, "Catatan maksimal 1000 karakter.").optional(),
});

/** Approver (Dosen Wali / Dosen Peneliti / Kaprodi): 1-Click Approve atau Minta Revisi. */
export async function decideApprovalAction(formData: FormData) {
  const user = await requireRole("DOSEN_WALI", "DOSEN_PENELITI", "KAPRODI");
  const back = (q: string): never => redirect(`/dashboard/approvals?${q}`);

  const parsed = decideSchema.safeParse({
    approvalId: formData.get("approvalId"),
    action: formData.get("action"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) back("error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Input tidak valid."));
  const input = parsed.data!;

  let result: Awaited<ReturnType<typeof decideApproval>>;
  try {
    result = await decideApproval({ actor: user, approvalId: input.approvalId, action: input.action, notes: input.notes });
  } catch (err) {
    if (err instanceof ApprovalRuleError) back("error=" + encodeURIComponent(err.message));
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: input.action === "APPROVE" ? "APPROVAL_APPROVE" : "APPROVAL_REQUEST_REVISION",
    entityName: "application_approvals",
    entityId: input.approvalId,
    payload: {
      role: user.activeRole,
      applicationId: result!.applicationId,
      notes: input.notes ?? null,
      applicationStatus: result!.applicationStatus,
    },
  });

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/student/tracker");
  revalidatePath("/dashboard/lecturer/applicants");
  back(
    `done=${input.action === "APPROVE" ? "approved" : "revision"}&name=${encodeURIComponent(result!.studentName)}` +
      `&status=${result!.applicationStatus}`,
  );
}

export type RevisionState = { nonce: number; error?: string };

/** Mahasiswa: perbaiki berkas setelah REVISION_REQUIRED lalu kirim ulang ke ketiga approver. */
export async function resubmitRevisionAction(
  applicationId: string,
  prev: RevisionState,
  formData: FormData,
): Promise<RevisionState> {
  const user = await requireRole("MAHASISWA");
  const nonce = prev.nonce + 1;
  if (!z.string().uuid().safeParse(applicationId).success) return { nonce, error: "Pendaftaran tidak ditemukan." };

  const parsed = applicationInputSchema.safeParse({
    proposalTitle: formData.get("proposalTitle"),
    conversionScheme: "MB04",
    includesKpConversion: formData.get("includesKpConversion") === "on",
  });
  if (!parsed.success) return { nonce, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  // Berkas proposal baru bersifat opsional saat revisi.
  let newFileKey: string | undefined;
  const file = formData.get("proposal");
  if (file instanceof File && file.size > 0) {
    try {
      newFileKey = await savePdf("proposals", await readPdfUpload(file, "Proposal revisi"));
    } catch (err) {
      if (err instanceof UploadError) return { nonce, error: err.message };
      throw err;
    }
  }

  // Berkas lama tetap disimpan sebagai jejak audit revisi (tidak dihapus).
  try {
    await resubmitRevision({
      studentId: user.id,
      applicationId,
      data: {
        proposalTitle: parsed.data.proposalTitle,
        includesKpConversion: parsed.data.includesKpConversion,
        proposalFileUrl: newFileKey,
      },
    });
  } catch (err) {
    if (newFileKey) await deleteStoredFile(newFileKey);
    if (err instanceof ApprovalRuleError) return { nonce, error: err.message };
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: "APPLICATION_RESUBMIT_REVISION",
    entityName: "applications",
    entityId: applicationId,
    payload: { ...parsed.data, newProposalFile: Boolean(newFileKey) },
  });

  revalidatePath("/dashboard/approvals");
  redirect("/dashboard/student/tracker?resubmitted=1");
}
