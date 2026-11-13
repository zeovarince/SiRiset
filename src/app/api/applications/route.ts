/**
 * POST /api/applications — api-spec.md §4.1 (MAHASISWA).
 * Body: multipart/form-data { vacancyId, proposalTitle, conversionScheme, includesKpConversion, proposal(.pdf) }
 * Verifikasi kelayakan SIAKAD dijalankan otomatis; logika sama dengan Server Action.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { applicationInputSchema } from "@/lib/application-schema";
import { ApplicationRuleError, submitApplication } from "@/lib/applications";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { UploadError, readPdfUpload } from "@/lib/storage";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "MAHASISWA") return fail(403, "Hanya Mahasiswa yang dapat mengajukan pendaftaran riset.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Body request harus berupa multipart/form-data.");
  }

  const vacancyId = z.string().uuid().safeParse(form.get("vacancyId"));
  if (!vacancyId.success) return fail(422, "vacancyId tidak valid.");

  const parsed = applicationInputSchema.safeParse({
    proposalTitle: form.get("proposalTitle"),
    conversionScheme: form.get("conversionScheme") ?? "MB04",
    includesKpConversion: form.get("includesKpConversion") ?? false,
  });
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  try {
    const pdf = await readPdfUpload(form.get("proposal"), "Proposal ringkas");
    const result = await submitApplication({ student: user, vacancyId: vacancyId.data, input: parsed.data, proposalPdf: pdf });
    await recordAudit({
      userId: user.id,
      action: "APPLICATION_SUBMIT",
      entityName: "applications",
      entityId: result.id,
      payload: { vacancyId: vacancyId.data, ...parsed.data, via: "api" },
    });
    return NextResponse.json(
      {
        success: true,
        statusCode: 201,
        message: `Lamaran berhasil diajukan dan memenuhi syarat kelayakan SIAKAD (IPK: ${result.eligibility.record.gpa.toFixed(2)}).`,
        data: {
          applicationId: result.id,
          status: "SUBMITTED",
          slaDeadline: result.slaDeadline.toISOString(),
          student: user.fullName,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UploadError) return fail(422, err.message);
    if (err instanceof ApplicationRuleError) return fail(422, err.message);
    throw err;
  }
}
