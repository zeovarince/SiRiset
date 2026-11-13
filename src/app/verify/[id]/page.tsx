import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { formatCode, verifyCertificate } from "@/lib/approval-certificate";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Verifikasi Dokumen", robots: { index: false, follow: false } };

/**
 * Halaman publik hasil pindai QR — siapa pun (mis. staf akademik fakultas) dapat memastikan
 * lembar pengesahan asli dan datanya tidak diubah. Tanpa kode valid, tidak ada data yang ditampilkan.
 */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  const result = /^[0-9a-f-]{36}$/.test(id)
    ? await verifyCertificate(id, c)
    : { valid: false as const, reason: "Tautan verifikasi tidak valid.", cert: null };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-navy-800 px-6 py-4">
        <BrandMark />
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        {result.valid ? (
          <section className="overflow-hidden rounded-2xl border border-green-300 bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-green-600 px-6 py-4 text-white">
              <BadgeCheck className="size-8" aria-hidden />
              <div>
                <h1 className="text-lg font-bold">Dokumen Sah & Utuh</h1>
                <p className="text-sm text-green-50">Data cocok dengan stempel digital saat pengesahan.</p>
              </div>
            </div>
            <dl className="space-y-3 px-6 py-5 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Nomor Dokumen</dt>
                <dd className="font-mono font-semibold">{result.cert.documentNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Mahasiswa</dt>
                <dd className="font-semibold">
                  {result.cert.application.student.fullName}{" "}
                  <span className="font-mono text-xs text-slate-500">({result.cert.application.student.nimNip})</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Riset</dt>
                <dd>{result.cert.application.vacancy.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Konversi</dt>
                <dd>
                  {result.cert.application.conversionScheme} · {result.cert.totalCredits} SKS
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs text-slate-500">Persetujuan Elektronik</dt>
                {result.cert.approvals.map((a) => (
                  <dd key={a.id} className="flex items-center gap-2 text-xs">
                    <BadgeCheck className="size-3.5 text-green-600" />
                    <span className="w-24 text-slate-500">{a.roleLabel}</span>
                    <span className="font-medium">{a.approver.fullName}</span>
                    <span className="ml-auto text-slate-400">{formatDateTime(a.decidedAt!)}</span>
                  </dd>
                ))}
              </div>
              <div>
                <dt className="text-xs text-slate-500">Kode Verifikasi</dt>
                <dd className="font-mono font-semibold tracking-wider">{formatCode(result.cert.code)}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="rounded-2xl border border-red-300 bg-white p-6 text-center shadow-sm">
            <ShieldAlert className="mx-auto size-12 text-red-500" aria-hidden />
            <h1 className="mt-3 text-lg font-bold text-red-700">Dokumen Tidak Dapat Diverifikasi</h1>
            <p className="mt-1 text-sm text-slate-600">{result.reason}</p>
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
