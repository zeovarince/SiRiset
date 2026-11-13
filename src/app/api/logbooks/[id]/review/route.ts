/**
 * POST /api/logbooks/:id/review — api-spec.md §7.2 (DOSEN_PENELITI pembimbing).
 * Body JSON: { "reviewStatus": "APPROVED" | "REVISION_REQUESTED", "feedbackNotes"?: string }
 */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { logbookReviewSchema } from "@/lib/logbook-schema";
import { LogbookRuleError, reviewLogbook } from "@/lib/logbooks";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "DOSEN_PENELITI" && user.activeRole !== "ADMIN") {
    return fail(403, "Hanya Dosen Peneliti pembimbing yang dapat mengulas logbook.");
  }

  const body = await req.json().catch(() => null);
  if (!body) return fail(400, "Body request harus berupa JSON yang valid.");
  const parsed = logbookReviewSchema.safeParse(body);
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  const { id } = await params;
  try {
    const result = await reviewLogbook({ lecturer: user, logbookId: id, input: parsed.data });
    await recordAudit({
      userId: user.id,
      action: parsed.data.reviewStatus === "APPROVED" ? "LOGBOOK_VALIDATE" : "LOGBOOK_REQUEST_REVISION",
      entityName: "logbooks",
      entityId: id,
      payload: { week: result.weekNumber, feedbackNotes: parsed.data.feedbackNotes ?? null, via: "api" },
    });
    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: parsed.data.reviewStatus === "APPROVED" ? "Logbook divalidasi." : "Logbook dikembalikan untuk revisi.",
      data: { logbookId: id, status: parsed.data.reviewStatus === "APPROVED" ? "VALIDATED" : "REVISION_NEEDED" },
    });
  } catch (err) {
    if (err instanceof LogbookRuleError) return fail(422, err.message);
    throw err;
  }
}
