/**
 * PATCH /api/applications/:id/decision — api-spec.md §4.2 (DOSEN_PENELITI pemilik lowongan).
 * Body JSON: { "decision": "ACCEPT" | "REJECT", "notes"?: string }
 */
import { NextResponse, type NextRequest } from "next/server";
import { decisionSchema } from "@/lib/application-schema";
import { ApplicationRuleError, decideApplication } from "@/lib/applications";
import { getCurrentUser, recordAudit } from "@/lib/auth";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "DOSEN_PENELITI" && user.activeRole !== "ADMIN") {
    return fail(403, "Hanya Dosen Peneliti pemilik lowongan yang dapat memutuskan pelamar.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Body request harus berupa JSON yang valid.");
  }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  const { id } = await params;
  try {
    const result = await decideApplication({ actor: user, applicationId: id, input: parsed.data });
    await recordAudit({
      userId: user.id,
      action: parsed.data.decision === "ACCEPT" ? "APPLICATION_ACCEPT" : "APPLICATION_REJECT",
      entityName: "applications",
      entityId: result.id,
      payload: { notes: parsed.data.notes ?? null, vacancyClosed: result.vacancyClosed, via: "api" },
    });
    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: parsed.data.decision === "ACCEPT" ? "Pelamar diterima." : "Pelamar ditolak.",
      data: { applicationId: result.id, status: result.status, vacancyClosed: result.vacancyClosed },
    });
  } catch (err) {
    if (err instanceof ApplicationRuleError) return fail(422, err.message);
    throw err;
  }
}
