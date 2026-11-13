/** GET /api/monev/reports/:id/file — unduh PDF Laporan Kemajuan dengan pemeriksaan hak akses (FR-07.2). */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessReport } from "@/lib/monev";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, statusCode: 401, message: "Autentikasi diperlukan." }, { status: 401 });

  const { id } = await params;
  const report = await canAccessReport(user, id);
  const file = report ? await readStoredFile(report.reportFileUrl) : null;
  if (!report || !file) {
    return NextResponse.json({ success: false, statusCode: 404, message: "Berkas tidak ditemukan." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="Laporan_Kemajuan_${report.application.student.nimNip}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
