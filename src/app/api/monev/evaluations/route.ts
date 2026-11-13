/**
 * POST /api/monev/evaluations — api-spec.md §8.2 (LPPM_REVIEWER).
 * Body JSON: { progressReportId, scoreProgress, scoreMethodology, evaluationNotes, improvementRecommendations? }
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { MonevRuleError, evaluateReport } from "@/lib/monev";
import { monevEvaluationSchema } from "@/lib/monev-schema";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "LPPM_REVIEWER") return fail(403, "Hanya Reviewer LPPM yang dapat menilai sesi monev.");

  const body = await req.json().catch(() => null);
  if (!body) return fail(400, "Body request harus berupa JSON yang valid.");
  const parsed = monevEvaluationSchema.and(z.object({ progressReportId: z.string().uuid() })).safeParse(body);
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  try {
    const result = await evaluateReport({ reviewer: user, reportId: parsed.data.progressReportId, input: parsed.data });
    await recordAudit({
      userId: user.id,
      action: "MONEV_EVALUATE",
      entityName: "monev_evaluations",
      entityId: result.id,
      payload: { ...parsed.data, average: result.grade.average, via: "api" },
    });
    return NextResponse.json(
      {
        success: true,
        statusCode: 201,
        message: "Penilaian monev tersimpan dan langsung terbaca Dosen Peneliti & Mahasiswa.",
        data: { evaluationId: result.id, average: result.grade.average, category: result.grade.category, majorRevision: result.grade.majorRevision },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof MonevRuleError) return fail(422, err.message);
    throw err;
  }
}
