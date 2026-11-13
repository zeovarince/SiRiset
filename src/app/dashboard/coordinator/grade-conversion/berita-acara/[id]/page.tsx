import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { appOrigin, formatCode, qrFor } from "@/lib/approval-certificate";
import { getBeritaAcara } from "@/lib/assessments";
import { requireRole } from "@/lib/auth";
import { conversionCourses } from "@/lib/application-schema";
import { formatDate, formatDateTime } from "@/lib/format";
import { RUBRIC } from "@/lib/grading";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Berita Acara Nilai Resmi" };

/** Berita Acara Nilai Resmi MBKM Riset ber-QR — siap cetak/PDF untuk Bagian Akademik Fakultas (FR-09.3). */
export default async function BeritaAcaraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ issued?: string; locked?: string }>;
}) {
  await requireRole("KOORDINATOR_MBKM");
  const { id } = await params;
  const sp = await searchParams;
  const ba = await getBeritaAcara(id);
  if (!ba) notFound();

  const { snapshot } = ba;
  const qr = await qrFor(`${await appOrigin()}/verify/berita-acara/${ba.id}?c=${snapshot.code}`);
  const kaprodi = await prisma.user.findFirst({
    where: { roles: { some: { roleCode: "KAPRODI" } }, isActive: true },
    select: { fullName: true, nimNip: true },
  });
  const mb04 = conversionCourses("MB04", false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href="/dashboard/coordinator/grade-conversion" className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800">
          <ArrowLeft className="size-4" /> Kembali ke Rekap Nilai
        </Link>
        <PrintButton label="Cetak / Simpan PDF" />
      </div>
      {sp.issued && (
        <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 print:hidden">
          <CheckCircle2 className="size-4" /> Berita acara terbit{Number(sp.locked) > 0 ? ` · ${sp.locked} nilai baru dikunci` : ""}. Nilai terkunci siap
          dikonversi ke SIAKAD.
        </p>
      )}
      {!ba.intact && (
        <p className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <ShieldAlert className="size-4" /> Peringatan: data nilai saat ini tidak cocok dengan berita acara ini.
        </p>
      )}

      <article className="mx-auto max-w-[297mm] bg-white text-[12px] leading-relaxed text-slate-900 shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        <header className="flex items-center gap-4 border-b-4 border-gold-500 bg-navy-800 px-8 py-5 text-white print:px-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gold-500 font-black text-navy-900">UTM</div>
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Universitas Trunodjoyo Madura</p>
            <p className="text-base font-bold">Fakultas Teknik · Program Studi S1 Teknik Informatika</p>
          </div>
        </header>

        <div className="space-y-5 px-8 py-6 print:px-4">
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wide text-navy-800 uppercase">Berita Acara Nilai Resmi Konversi MBKM Riset</h1>
            <p className="text-xs text-slate-600">
              Nomor: <span className="font-mono font-semibold">{snapshot.baNumber}</span> · Kode MK MB04 (20 SKS) · Semester {snapshot.period}
            </p>
          </div>

          <p>
            Pada {formatDateTime(new Date(snapshot.issuedAt))}, Koordinator MBKM Program Studi Teknik Informatika menetapkan nilai akhir
            peserta Program MBKM Riset berdasarkan rubrik penilaian digital resmi prodi (Kedisiplinan & Logbook 20%, Kualitas Teknis &
            Metodologi 30%, Pemenuhan Luaran 30%, Laporan & Presentasi 20%) sebagai berikut:
          </p>

          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-slate-100">
              <tr>
                {["No", "NIM", "Nama", "Dosen Peneliti", ...RUBRIC.map((r) => `S${r.no}`), "Nilai", "Huruf", "SKS Diakui"].map((h) => (
                  <th key={h} className="border border-slate-300 px-2 py-1.5 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot.rows.map((r, i) => (
                <tr key={r.applicationId} className="align-top">
                  <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{r.nim}</td>
                  <td className="border border-slate-300 px-2 py-1 font-medium">{r.studentName}</td>
                  <td className="border border-slate-300 px-2 py-1">
                    {r.lecturerName}
                    <span className="block font-mono text-[9px] text-slate-500">{r.lecturerNip}</span>
                  </td>
                  {RUBRIC.map((rb) => (
                    <td key={rb.key} className="border border-slate-300 px-2 py-1 text-right tabular-nums">
                      {r.scores[rb.key].toFixed(1)}
                    </td>
                  ))}
                  <td className="border border-slate-300 px-2 py-1 text-right font-semibold tabular-nums">{r.final.toFixed(2)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-center text-sm font-black">{r.letter}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    {r.recognizedCredits}/{r.credits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-[11px] text-slate-600">
            Konversi paket MB04 ({mb04.totalCredits} SKS): {mb04.list.map((c) => `${c.name} (${c.credits})`).join(", ")}. Seluruh mata kuliah
            paket menerima huruf mutu yang sama dengan nilai akhir; KP 2 SKS ditambahkan bagi peserta yang disetujui konversi KP.
          </p>

          <div className="grid grid-cols-3 items-end gap-6 pt-2 text-xs">
            <div className="text-center">
              <p>Mengetahui,</p>
              <p>Koordinator Program Studi</p>
              <p className="mt-14 font-semibold underline">{kaprodi?.fullName ?? "—"}</p>
              <p className="font-mono text-[10px]">NIP {kaprodi?.nimNip ?? "—"}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="size-28 [&>svg]:h-full [&>svg]:w-full"
                role="img"
                aria-label="QR-Code verifikasi berita acara"
                dangerouslySetInnerHTML={{ __html: qr.svg }}
              />
              <p className="font-mono text-[10px] font-bold tracking-wider">{formatCode(snapshot.code)}</p>
              <p className="text-center text-[9px] text-slate-500">Pindai untuk memverifikasi keaslian & keutuhan nilai</p>
            </div>
            <div className="text-center">
              <p>Bangkalan, {formatDate(new Date(snapshot.issuedAt))}</p>
              <p>Koordinator MBKM Prodi TI</p>
              <p className="mt-14 font-semibold underline">{snapshot.issuedBy.name}</p>
              <p className="font-mono text-[10px]">NIP {snapshot.issuedBy.nip}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
