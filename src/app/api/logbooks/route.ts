/**
 * POST /api/logbooks — api-spec.md §7.1 (MAHASISWA).
 * Body multipart/form-data: applicationId, weekNumber, activityDate, durationHours, activityDescription,
 * challengesFaced?, solutionsImplemented?, repositoryLink?, evidence? (JPG/PNG ≤ 2 MB, PDF ≤ 5 MB).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { logbookInputSchema } from "@/lib/logbook-schema";
import { LogbookRuleError, saveLogbook } from "@/lib/logbooks";
import { UploadError, readEvidenceUpload } from "@/lib/storage";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "MAHASISWA") return fail(403, "Hanya Mahasiswa yang dapat mengisi logbook.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Body request harus berupa multipart/form-data.");
  }
  const ids = z
    .object({ applicationId: z.string().uuid(), weekNumber: z.coerce.number().int().min(1).max(16) })
    .safeParse({ applicationId: form.get("applicationId"), weekNumber: form.get("weekNumber") });
  if (!ids.success) return fail(422, "applicationId atau weekNumber tidak valid.", ids.error.flatten().fieldErrors);

  const input = logbookInputSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!input.success) return fail(422, "Validasi gagal.", input.error.flatten().fieldErrors);

  try {
    const evidence = await readEvidenceUpload(form.get("evidence"));
    const result = await saveLogbook({
      studentId: user.id,
      applicationId: ids.data.applicationId,
      week: ids.data.weekNumber,
      input: input.data,
      evidence,
    });
    await recordAudit({
      userId: user.id,
      action: result.created ? "LOGBOOK_SUBMIT" : "LOGBOOK_RESUBMIT",
      entityName: "logbooks",
      entityId: result.id,
      payload: { week: ids.data.weekNumber, isLate: result.isLate, via: "api" },
    });
    return NextResponse.json(
      {
        success: true,
        statusCode: result.created ? 201 : 200,
        message: result.isLate ? "Logbook tersimpan dan ditandai TERLAMBAT." : "Logbook tersimpan.",
        data: { logbookId: result.id, weekNumber: ids.data.weekNumber, isLate: result.isLate, status: "SUBMITTED" },
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof UploadError || err instanceof LogbookRuleError) return fail(422, err.message);
    throw err;
  }
}
