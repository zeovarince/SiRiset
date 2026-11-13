import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { QuotaBadge } from "@/components/status-badge";
import { SiakadVerification } from "@/components/siakad-verification";
import { blockMessage, getApplyContext } from "@/lib/applications";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { SELECTION_SLA_WORKING_DAYS } from "@/lib/sla";
import { ApplyForm } from "./apply-form";

export const metadata = { title: "Formulir Pendaftaran Riset" };

/** Layar 2 — Formulir Pendaftaran Satu Pintu dengan verifikasi SIAKAD otomatis (FR-03, BR-03). */
export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("MAHASISWA");
  const { id } = await params;
  const ctx = await getApplyContext(user, id);
  if (!ctx || ctx.vacancy.status === "DRAFT") notFound();

  const { vacancy, eligibility, block } = ctx;
  const infoBlock = block && block.code !== "not-eligible" ? block : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/dashboard/student/vacancies"
        className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" /> Kembali ke Katalog
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-gold-600 uppercase">
          Formulir Pendaftaran MBKM Riset (Kode MK: MB04)
        </p>
        <h2 className="mt-2 text-lg leading-snug font-bold text-navy-800">{vacancy.title}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Dosen Pembimbing</dt>
            <dd className="font-medium">{vacancy.lecturer.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Nomor Kontrak Hibah</dt>
            <dd className="font-mono font-medium">{vacancy.grantContractNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Batas Pendaftaran</dt>
            <dd className="flex flex-wrap items-center gap-2 font-medium">
              {formatDate(vacancy.applicationEndDate)}
              <QuotaBadge remaining={ctx.remainingQuota} quota={vacancy.quota} />
            </dd>
          </div>
        </dl>
      </section>

      <SiakadVerification result={eligibility} />

      {infoBlock && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
          <Info className="size-4 shrink-0" aria-hidden />
          <p className="flex-1">{blockMessage(infoBlock)}</p>
          {(infoBlock.code === "already-applied" || infoBlock.code === "active-elsewhere") && (
            <Link
              href="/dashboard/student/tracker"
              className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline"
            >
              Lihat status pendaftaran <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      )}

      <ApplyForm vacancyId={vacancy.id} disabled={Boolean(block)} />

      <p className="text-center text-xs text-slate-500">
        Setelah dikirim, Dosen Peneliti wajib memutuskan dalam {SELECTION_SLA_WORKING_DAYS} hari kerja (BR-06). Pantau
        progresnya di menu Status Pendaftaran.
      </p>
    </div>
  );
}
