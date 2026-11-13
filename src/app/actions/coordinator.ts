"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit, requireRole } from "@/lib/auth";
import { CoordinatorRuleError, runSimpelmasSync, validateApplication } from "@/lib/coordinator";
import { SimpelmasUnavailableError } from "@/lib/simpelmas-mock";

const VERIFY = "/dashboard/coordinator/verification";
const SYNC = "/dashboard/coordinator/sync-simpelmas";

/** Validasi Akhir Prodi: APPROVAL_COMPLETE → IN_PROGRESS. */
export async function validateApplicationAction(formData: FormData) {
  const user = await requireRole("KOORDINATOR_MBKM");
  const id = z.string().uuid().safeParse(formData.get("applicationId"));
  if (!id.success) redirect(`${VERIFY}?error=${encodeURIComponent("Berkas tidak ditemukan.")}`);

  let studentName: string;
  try {
    ({ studentName } = await validateApplication(id.data));
  } catch (err) {
    if (err instanceof CoordinatorRuleError) redirect(`${VERIFY}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: "COORDINATOR_VALIDATE",
    entityName: "applications",
    entityId: id.data,
    payload: { status: "IN_PROGRESS" },
  });
  revalidatePath(VERIFY);
  revalidatePath(SYNC);
  revalidatePath("/dashboard/student/tracker");
  redirect(`${VERIFY}?validated=${encodeURIComponent(studentName)}`);
}

/** 1-Click Sync ke SIMPELMAS LPPM. */
export async function syncSimpelmasAction() {
  const user = await requireRole("KOORDINATOR_MBKM");

  let result: Awaited<ReturnType<typeof runSimpelmasSync>>;
  try {
    result = await runSimpelmasSync(user);
  } catch (err) {
    if (err instanceof SimpelmasUnavailableError) redirect(`${SYNC}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  await recordAudit({
    userId: user.id,
    action: "SIMPELMAS_SYNC",
    entityName: "simpelmas_sync_logs",
    entityId: result.batchReferenceId ?? "NO_CHANGES",
    payload: result,
  });
  revalidatePath(SYNC);
  revalidatePath(VERIFY);

  const q = new URLSearchParams({
    synced: String(result.syncedCount),
    failed: String(result.failedCount),
    batch: result.batchReferenceId ?? "",
  });
  redirect(`${SYNC}?${q}`);
}
