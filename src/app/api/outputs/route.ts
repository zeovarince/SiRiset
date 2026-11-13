/**
 * POST /api/outputs — api-spec.md §9.1 (MAHASISWA).
 * Body multipart/form-data: applicationId, outputType, title, targetPublicationName, publicationStatus?,
 * document? (PDF ≤ 5 MB / PNG·JPG ≤ 2 MB) atau demoLink (https).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { outputInputSchema } from "@/lib/grading-schema";
import { OutputRuleError, createOutput } from "@/lib/outputs";
import { UploadError, readEvidenceUpload } from "@/lib/storage";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "MAHASISWA") return fail(403, "Hanya Mahasiswa yang dapat mendaftarkan luaran.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Body request harus berupa multipart/form-data.");
  }
  const appId = z.string().uuid().safeParse(form.get("applicationId"));
  if (!appId.success) return fail(422, "applicationId tidak valid.");
  const parsed = outputInputSchema.safeParse({
    outputType: form.get("outputType"),
    title: form.get("title"),
    targetPublicationName: form.get("targetPublicationName"),
    publicationStatus: form.get("publicationStatus") ?? "DRAFT",
    demoLink: form.get("demoLink") ?? undefined,
  });
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  try {
    const document = await readEvidenceUpload(form.get("document"), "Berkas luaran");
    const created = await createOutput({ studentId: user.id, applicationId: appId.data, input: parsed.data, document });
    await recordAudit({ userId: user.id, action: "OUTPUT_CREATE", entityName: "research_outputs", entityId: created.id, payload: { ...parsed.data, via: "api" } });
    return NextResponse.json(
      { success: true, statusCode: 201, message: "Luaran riset terdaftar — menunggu verifikasi Dosen Peneliti.", data: { outputId: created.id } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UploadError || err instanceof OutputRuleError) return fail(422, err.message);
    throw err;
  }
}
