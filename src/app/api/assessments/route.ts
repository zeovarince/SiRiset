/**
 * POST /api/assessments — api-spec.md §9.2 (DOSEN_PENELITI).
 * Body JSON: { applicationId, scoreDisciplineLogbook, scoreResearchQuality, scoreOutputAchievement,
 *              scoreReportPresentation, action?: "PUBLISH" (default) | "DRAFT" }
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AssessmentRuleError, saveAssessment } from "@/lib/assessments";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { assessmentInputSchema } from "@/lib/grading-schema";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

const bodySchema = assessmentInputSchema.and(
  z.object({ applicationId: z.string().uuid(), action: z.enum(["PUBLISH", "DRAFT"]).default("PUBLISH") }),
);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "DOSEN_PENELITI" && user.activeRole !== "ADMIN") return fail(403, "Hanya Dosen Peneliti yang dapat menilai.");

  const body = await req.json().catch(() => null);
  if (!body) return fail(400, "Body request harus berupa JSON yang valid.");
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  const publish = parsed.data.action === "PUBLISH";
  try {
    const r = await saveAssessment({ lecturer: user, applicationId: parsed.data.applicationId, input: parsed.data, publish });
    await recordAudit({
      userId: user.id,
      action: publish ? "GRADE_PUBLISH" : "GRADE_DRAFT",
      entityName: "grade_assessments",
      entityId: parsed.data.applicationId,
      payload: { finalNumericScore: r.finalNumericScore, letterGrade: r.letterGrade, via: "api" },
    });
    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: publish ? "Penilaian berhasil disimpan dan diterbitkan." : "Draf penilaian tersimpan.",
      data: {
        finalNumericScore: r.finalNumericScore,
        letterGrade: r.letterGrade,
        conversionTarget: r.conversion.target,
        finalizedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof AssessmentRuleError) return fail(422, err.message);
    throw err;
  }
}
