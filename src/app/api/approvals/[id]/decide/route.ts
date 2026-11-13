/**
 * POST /api/approvals/:id/decide — api-spec.md §5.2 (One-Click E-Approval).
 * Body JSON: { "action": "APPROVE" | "REJECT" | "REJECT_WITH_NOTES", "notes"?: string }
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApprovalRuleError, decideApproval, isApprovalRole } from "@/lib/approvals";
import { getCurrentUser, recordAudit } from "@/lib/auth";

const bodySchema = z.object({
  action: z
    .enum(["APPROVE", "REJECT", "REJECT_WITH_NOTES"])
    .transform((a): "APPROVE" | "REJECT" => (a === "APPROVE" ? "APPROVE" : "REJECT")),
  notes: z.string().trim().max(1000).optional(),
});

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (!isApprovalRole(user.activeRole)) return fail(403, "Peran aktif bukan Dosen Wali, Dosen Peneliti, atau Kaprodi.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Body request harus berupa JSON yang valid.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);

  const { id } = await params;
  try {
    const result = await decideApproval({ actor: user, approvalId: id, ...parsed.data });
    await recordAudit({
      userId: user.id,
      action: parsed.data.action === "APPROVE" ? "APPROVAL_APPROVE" : "APPROVAL_REQUEST_REVISION",
      entityName: "application_approvals",
      entityId: id,
      payload: { role: user.activeRole, notes: parsed.data.notes ?? null, applicationStatus: result.applicationStatus, via: "api" },
    });
    return NextResponse.json({
      success: true,
      statusCode: 200,
      message:
        result.applicationStatus === "APPROVAL_COMPLETE"
          ? "Ketiga pihak telah menyetujui. Berkas masuk antrean validasi Koordinator MBKM."
          : "Keputusan e-approval tersimpan.",
      data: { applicationId: result.applicationId, applicationStatus: result.applicationStatus, approvedCount: result.approvedCount },
    });
  } catch (err) {
    if (err instanceof ApprovalRuleError) return fail(422, err.message);
    throw err;
  }
}
