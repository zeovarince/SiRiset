/** GET /api/logbooks/:id/evidence — unduh/lihat berkas bukti logbook dengan pemeriksaan hak akses. */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLogbook } from "@/lib/logbooks";
import { CONTENT_TYPES, extOfKey, readStoredFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, statusCode: 401, message: "Autentikasi diperlukan." }, { status: 401 });

  const { id } = await params;
  const logbook = await canAccessLogbook(user, id);
  const key = logbook?.evidenceFileUrl;
  const ext = key ? extOfKey(key) : null;
  const file = key ? await readStoredFile(key) : null;
  if (!logbook || !ext || !file) {
    return NextResponse.json({ success: false, statusCode: 404, message: "Berkas tidak ditemukan." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="Bukti_Logbook_${logbook.application.student.nimNip}_M${String(logbook.weekNumber).padStart(2, "0")}.${ext}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
