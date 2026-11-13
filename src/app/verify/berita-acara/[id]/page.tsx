import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { codesMatch, formatCode } from "@/lib/approval-certificate";
import { getBeritaAcara } from "@/lib/assessments";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Verifikasi Berita Acara Nilai", robots: { index: false, follow: false } };

/** Verifikasi publik Berita Acara Nilai (hasil pindai QR) — tanpa kode valid tidak ada data yang ditampilkan. */
export default async function VerifyBeritaAcaraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  const ba = /^[0-9a-f-]{36}$/.test(id) ? await getBeritaAcara(id) : null;
  const codeOk = ba ? codesMatch(c, ba.snapshot.code) : false;
  const valid = Boolean(ba && codeOk && ba.intact);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-navy-800 px-6 py-4">
        <BrandMark />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        {valid && ba ? (
          <section className="overflow-hidden rounded-2xl border border-green-300 bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-green-600 px-6 py-4 text-white">
              <BadgeCheck className="size-8" aria-hidden />
              <div>
                <h1 className="text-lg font-bold">Berita Acara Nilai Sah & Utuh</h1>
                <p className="text-sm text-green-50">Nilai saat ini identik dengan nilai pada saat berita acara diterbitkan.</p>
              </div>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              <p>
                Nomor <span className="font-mono font-semibold">{ba.snapshot.baNumber}</span> · Semester {ba.snapshot.period} · diterbitkan{" "}
                {formatDateTime(new Date(ba.snapshot.issuedAt))} oleh {ba.snapshot.issuedBy.name}
              </p>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">NIM</th>
                    <th className="px-2 py-1.5">Nama</th>
                    <th className="px-2 py-1.5 text-right">Nilai</th>
                    <th className="px-2 py-1.5 text-center">Huruf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ba.snapshot.rows.map((r) => (
                    <tr key={r.applicationId}>
                      <td className="px-2 py-1.5 font-mono">{r.nim}</td>
                      <td className="px-2 py-1.5">{r.studentName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.final.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-center font-bold">{r.letter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500">
                Kode verifikasi: <span className="font-mono font-semibold">{formatCode(ba.snapshot.code)}</span>
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-red-300 bg-white p-6 text-center shadow-sm">
            <ShieldAlert className="mx-auto size-12 text-red-500" aria-hidden />
            <h1 className="mt-3 text-lg font-bold text-red-700">Berita Acara Tidak Dapat Diverifikasi</h1>
            <p className="mt-1 text-sm text-slate-600">
              {!ba || !codeOk
                ? "Dokumen tidak ditemukan atau kode verifikasi tidak sah."
                : "Nilai pada basis data telah berubah sejak berita acara ini diterbitkan."}
            </p>
          </section>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">
          Layanan verifikasi SiRiset · Program Studi Teknik Informatika UTM ·{" "}
          <Link href="/" className="underline">
            Beranda
          </Link>
        </p>
      </main>
    </div>
  );
}
