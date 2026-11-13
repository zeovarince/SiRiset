/**
 * GET /api/applications/:id/proposal — unduh proposal PDF dengan pemeriksaan hak akses.
 * Berkas disimpan di luar public/, sehingga route ini satu-satunya jalur akses.
 */
import { NextResponse, type NextRequest } from "next/server";
import { canAccessApplication } from "@/lib/applications";
import { getCurrentUser } from "@/lib/auth";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, statusCode: 401, message: "Autentikasi diperlukan." }, { status: 401 });

  const { id } = await params;
  const app = await canAccessApplication(user, id);
  if (!app) return NextResponse.json({ success: false, statusCode: 404, message: "Berkas tidak ditemukan." }, { status: 404 });

  const file = await readStoredFile(app.proposalFileUrl);
  if (!file) return NextResponse.json({ success: false, statusCode: 404, message: "Berkas tidak ditemukan." }, { status: 404 });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="Proposal_${app.student.nimNip}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
