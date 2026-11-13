/** GET /api/approvals/pending — api-spec.md §5.1 (DOSEN_WALI, DOSEN_PENELITI, KAPRODI). */
import { NextResponse } from "next/server";
import { isApprovalRole, listPendingApprovals } from "@/lib/approvals";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, statusCode: 401, message: "Autentikasi diperlukan." }, { status: 401 });
  if (!isApprovalRole(user.activeRole)) {
    return NextResponse.json(
      { success: false, statusCode: 403, message: "Peran aktif bukan Dosen Wali, Dosen Peneliti, atau Kaprodi." },
      { status: 403 },
    );
  }

  const pending = await listPendingApprovals(user);
  return NextResponse.json({
    success: true,
    statusCode: 200,
    data: pending.map((ap) => ({
      approvalId: ap.id,
      applicationId: ap.applicationId,
      studentName: ap.application.student.fullName,
      nim: ap.application.student.nimNip,
      researchTitle: ap.application.vacancy.title,
      gpa: Number(ap.application.gpaAtApplication),
      roleToApprove: ap.approverRole,
      documentDownloadUrl: `/api/applications/${ap.applicationId}/proposal`,
    })),
  });
}
