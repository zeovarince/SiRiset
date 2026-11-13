/** GET /api/outputs/:id/file — unduh berkas luaran (draf naskah / poster) dengan pemeriksaan hak akses. */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessOutput, isStoredDocument } from "@/lib/outputs";
import { CONTENT_TYPES, extOfKey, readStoredFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, statusCode: 401, message: "Autentikasi diperlukan." }, { status: 401 });

  const { id } = await params;
  const output = await canAccessOutput(user, id);
  if (!output || !isStoredDocument(output.documentFileUrl)) {
    return NextResponse.json({ success: false, statusCode: 404, message: "Berkas tidak ditemukan." }, { status: 404 });
  }
  const ext = extOfKey(output.documentFileUrl);
  const file = await readStoredFile(output.documentFileUrl);
  if (!ext || !file) return NextResponse.json({ success: false, statusCode: 404, message: "Berkas tidak ditemukan." }, { status: 404 });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="Luaran_${output.outputType}_${output.application.student.nimNip}.${ext}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
