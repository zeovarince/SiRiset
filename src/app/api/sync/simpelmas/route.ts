/**
 * POST /api/sync/simpelmas — api-spec.md §6.1 (KOORDINATOR_MBKM, ADMIN).
 * Body JSON (opsional): { "academicPeriod": "2026/2027 Ganjil", "facultyCode": "FT" }
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { runSimpelmasSync } from "@/lib/coordinator";
import { academicPeriod } from "@/lib/format";
import { SimpelmasUnavailableError } from "@/lib/simpelmas-mock";

const bodySchema = z.object({
  academicPeriod: z.string().optional(),
  facultyCode: z.literal("FT").optional(),
});

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "KOORDINATOR_MBKM" && user.activeRole !== "ADMIN") {
    return fail(403, "Hanya Koordinator MBKM yang dapat menjalankan sinkronisasi SIMPELMAS.");
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);
  const current = academicPeriod().code;
  if (parsed.data.academicPeriod && parsed.data.academicPeriod !== current) {
    return fail(422, `Hanya periode berjalan (${current}) yang dapat disinkronkan.`);
  }

  try {
    const result = await runSimpelmasSync(user);
    await recordAudit({
      userId: user.id,
      action: "SIMPELMAS_SYNC",
      entityName: "simpelmas_sync_logs",
      entityId: result.batchReferenceId ?? "NO_CHANGES",
      payload: { ...result, via: "api" },
    });
    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: result.alreadySynced
        ? "Tidak ada perubahan: seluruh data peserta sudah sinkron dengan SIMPELMAS."
        : `Sinkronisasi berhasil: ${result.syncedCount} data mahasiswa riset berhasil dicatat di SIMPELMAS.`,
      data: {
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
        timestamp: result.timestamp,
        batchReferenceId: result.batchReferenceId,
      },
    });
  } catch (err) {
    if (err instanceof SimpelmasUnavailableError) return fail(503, err.message);
    throw err;
  }
}
