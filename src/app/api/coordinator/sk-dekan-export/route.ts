/**
 * GET /api/coordinator/sk-dekan-export — unduh rekap peserta tervalidasi (CSV) untuk usulan SK Dekan FT.
 * Format CSV: pemisah titik koma + BOM UTF-8 agar langsung terbaca rapi di Microsoft Excel locale Indonesia.
 */
import { NextResponse } from "next/server";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { formatCode } from "@/lib/approval-certificate";
import { getSkDekanRecap } from "@/lib/coordinator";
import { toDateInputValue } from "@/lib/format";

const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, statusCode: 401, message: "Autentikasi diperlukan." }, { status: 401 });
  if (user.activeRole !== "KOORDINATOR_MBKM" && user.activeRole !== "ADMIN") {
    return NextResponse.json({ success: false, statusCode: 403, message: "Hanya Koordinator MBKM." }, { status: 403 });
  }

  const recap = await getSkDekanRecap();
  const header = [
    "No",
    "NIM",
    "Nama Mahasiswa",
    "Program Studi",
    "Judul Riset",
    "Dosen Peneliti (Ketua)",
    "NIP Dosen Ketua",
    "Nomor Kontrak Hibah",
    "Skema Hibah",
    "Konversi",
    "Total SKS",
    "Tanggal Mulai",
    "ID SIMPELMAS",
    "Kode Verifikasi Pengesahan",
  ];
  const lines = [
    header.map(cell).join(";"),
    ...recap.rows.map((r) =>
      [
        r.no,
        r.nim,
        r.studentName,
        r.programStudy,
        r.researchTitle,
        r.leadLecturerName,
        r.leadLecturerNip,
        r.grantContractNumber,
        r.grantScheme,
        r.conversion,
        r.credits,
        r.startDate,
        r.simpelmasId ?? "BELUM SINKRON",
        r.certificateCode ? formatCode(r.certificateCode) : "",
      ]
        .map(cell)
        .join(";"),
    ),
  ];

  await recordAudit({
    userId: user.id,
    action: "EXPORT_SK_DEKAN",
    entityName: "applications",
    entityId: "SK_DEKAN_RECAP",
    payload: { rows: recap.rows.length, format: "csv", period: recap.period.code },
  });

  const filename = `Rekap_SK_Dekan_MBKM_Riset_TI_${recap.period.code.replace(/[\s/]+/g, "_")}_${toDateInputValue(recap.generatedAt)}.csv`;
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
