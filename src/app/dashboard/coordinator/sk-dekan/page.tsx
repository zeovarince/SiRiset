import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { formatCode } from "@/lib/approval-certificate";
import { requireRole } from "@/lib/auth";
import { getSkDekanRecap } from "@/lib/coordinator";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Rekap Usulan SK Dekan" };

/** Lampiran usulan SK Dekan Fakultas Teknik — rekap peserta MBKM Riset tervalidasi (siap cetak/PDF). */
export default async function SkDekanPage() {
  const user = await requireRole("KOORDINATOR_MBKM");
  const recap = await getSkDekanRecap();
  const totalCredits = recap.rows.reduce((n, r) => n + r.credits, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href="/dashboard/coordinator/sync-simpelmas"
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800"
        >
          <ArrowLeft className="size-4" /> Kembali ke Sinkronisasi SIMPELMAS
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/coordinator/sk-dekan-export"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="size-4" /> Unduh CSV (Excel)
          </a>
          <PrintButton label="Cetak / Simpan PDF" />
        </div>
      </div>

      {recap.unsyncedCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {recap.unsyncedCount} peserta belum tersinkron dengan SIMPELMAS. Sinkronkan terlebih dahulu agar data SK Dekan
            identik dengan data LPPM.
          </p>
        </div>
      )}

      <article className="bg-white text-[12px] leading-relaxed text-slate-900 shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        <header className="flex items-center gap-4 border-b-4 border-gold-500 bg-navy-800 px-8 py-5 text-white print:px-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gold-500 font-black text-navy-900">UTM</div>
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Universitas Trunodjoyo Madura</p>
            <p className="text-base font-bold">Fakultas Teknik · Program Studi S1 Teknik Informatika</p>
          </div>
        </header>

        <div className="space-y-5 px-8 py-6 print:px-4">
          <div className="text-center">
            <p className="text-xs text-slate-500">Lampiran Usulan Surat Keputusan Dekan Fakultas Teknik</p>
            <h1 className="text-base font-bold tracking-wide text-navy-800 uppercase">
              Daftar Peserta Program MBKM Riset (Kode MK: MB04)
            </h1>
            <p className="text-xs text-slate-600">
              Semester {recap.period.label} · Disusun {formatDateTime(recap.generatedAt)}
            </p>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[860px] border-collapse text-[11px] print:min-w-0">
            <thead className="bg-slate-100">
              <tr>
                {["No", "NIM", "Nama Mahasiswa", "Judul Riset", "Dosen Peneliti (Ketua) / NIP", "No. Kontrak Hibah", "Konversi", "Mulai", "ID SIMPELMAS"].map(
                  (h) => (
                    <th key={h} className="border border-slate-300 px-2 py-1.5 text-left font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {recap.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border border-slate-300 px-2 py-6 text-center text-slate-500">
                    Belum ada peserta tervalidasi pada periode ini.
                  </td>
                </tr>
              ) : (
                recap.rows.map((r) => (
                  <tr key={r.nim} className="align-top">
                    <td className="border border-slate-300 px-2 py-1">{r.no}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{r.nim}</td>
                    <td className="border border-slate-300 px-2 py-1 font-medium">{r.studentName}</td>
                    <td className="min-w-56 border border-slate-300 px-2 py-1">{r.researchTitle}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      {r.leadLecturerName}
                      <span className="block font-mono text-[10px] text-slate-500">{r.leadLecturerNip}</span>
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{r.grantContractNumber}</td>
                    <td className="border border-slate-300 px-2 py-1 whitespace-nowrap">{r.conversion}</td>
                    <td className="border border-slate-300 px-2 py-1 whitespace-nowrap">{formatDate(new Date(r.startDate))}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">
                      {r.simpelmasId ?? <span className="text-amber-700">Belum sinkron</span>}
                      {r.certificateCode && (
                        <span className="block text-[9px] text-slate-500">QR {formatCode(r.certificateCode)}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {recap.rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={6} className="border border-slate-300 px-2 py-1.5 text-right">
                    Jumlah peserta: {recap.rows.length} mahasiswa
                  </td>
                  <td colSpan={3} className="border border-slate-300 px-2 py-1.5">Total {totalCredits} SKS diakui</td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
            <p className="text-slate-600">
              Seluruh peserta telah lolos verifikasi SIAKAD, E-Approval 3 pihak (ber-QR), dan validasi akhir Koordinator
              MBKM melalui SiRiset. Keabsahan tiap peserta dapat diverifikasi melalui kode QR pada lembar pengesahan.
            </p>
            <div className="text-center">
              <p>Bangkalan, {formatDate(recap.generatedAt)}</p>
              <p>Koordinator MBKM Program Studi Teknik Informatika</p>
              <p className="mt-14 font-semibold underline">{user.fullName}</p>
              <p className="font-mono text-[10px]">NIP {user.nimNip}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
