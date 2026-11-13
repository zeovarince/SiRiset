import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";
import { ArrowRight, CheckCircle2, FileDown, MessageSquareText, QrCode, RotateCcw, Route, XCircle } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { SlaBadge } from "@/components/sla-badge";
import { ApplicationStatusBadge, StatusBadge } from "@/components/status-badge";
import { StatusStepper, type Step, type StepState } from "@/components/status-stepper";
import { CONVERSION_SCHEMES, type ConversionScheme } from "@/lib/application-schema";
import { listStudentApplications } from "@/lib/applications";
import { APPROVAL_ROLE_LABELS, APPROVED_STATUSES, backfillApprovalForks } from "@/lib/approvals";
import { RevisionForm } from "./revision-form";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { slaLabel, slaStatus } from "@/lib/sla";
import { cn } from "@/lib/utils";

export const metadata = { title: "Status Pendaftaran" };

type TrackedApplication = Awaited<ReturnType<typeof listStudentApplications>>[number];

/** Indeks tahap yang sedang berjalan untuk setiap status (0-based, 5 = semua selesai). */
const CURRENT_STEP: Record<ApplicationStatus, number> = {
  SUBMITTED: 1,
  DOSEN_ACCEPTED: 2,
  APPROVAL_PENDING: 2,
  REVISION_REQUIRED: 2,
  APPROVAL_COMPLETE: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  REJECTED: 1,
};

const ROLE_LABEL: Record<string, string> = APPROVAL_ROLE_LABELS;

const CURRENT_TEXT: Record<ApplicationStatus, string> = {
  SUBMITTED: "Under review oleh Dosen Peneliti",
  DOSEN_ACCEPTED: "Diterima Dosen Peneliti — menunggu E-Approval 3 pihak",
  APPROVAL_PENDING: "E-Approval simultan sedang berjalan",
  REVISION_REQUIRED: "Berkas perlu revisi — perbaiki sesuai catatan approver",
  APPROVAL_COMPLETE: "E-Approval lengkap — menunggu validasi Koordinator MBKM",
  IN_PROGRESS: "Riset aktif berjalan",
  COMPLETED: "Riset selesai",
  REJECTED: "Pendaftaran ditolak Dosen Peneliti",
};

function buildSteps(a: TrackedApplication): Step[] {
  const current = CURRENT_STEP[a.status];
  const approved = a.approvals.filter((x) => x.status === "APPROVED").length;
  const stateOf = (i: number): StepState =>
    a.status === "REJECTED" && i === 1
      ? "failed"
      : a.status === "REVISION_REQUIRED" && i === 2
        ? "revision"
        : i < current
          ? "done"
          : i === current
            ? "current"
            : "pending";

  const selectionCaption =
    a.status === "SUBMITTED"
      ? slaLabel(slaStatus(a.slaDeadline))
      : a.status === "REJECTED"
        ? `Ditolak ${a.selectionDecidedAt ? formatDate(a.selectionDecidedAt) : ""}`
        : `Diterima ${a.selectionDecidedAt ? formatDate(a.selectionDecidedAt) : ""}`;

  return [
    { title: "Submitted", caption: formatDate(a.createdAt), state: stateOf(0) },
    { title: "Seleksi Dosen", caption: `SLA 7 hari kerja · ${selectionCaption}`, state: stateOf(1) },
    {
      title: "E-Approval 3 Pihak",
      caption:
        a.status === "REVISION_REQUIRED"
          ? "Dikembalikan untuk revisi"
          : a.approvals.length
            ? `${approved}/3 disetujui`
            : "Dosen Wali · Peneliti · Kaprodi",
      state: stateOf(2),
    },
    { title: "Validasi Koordinator", caption: "Prodi TI & sinkron LPPM", state: stateOf(3) },
    { title: "Riset Aktif", caption: "16 minggu · konversi 20 SKS", state: stateOf(4) },
  ];
}

function ApplicationCard({ a, highlight }: { a: TrackedApplication; highlight: boolean }) {
  const scheme = CONVERSION_SCHEMES[a.conversionScheme as ConversionScheme];
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm",
        highlight ? "border-gold-400 ring-2 ring-gold-200" : "border-slate-200",
      )}
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Status saat ini</p>
          <p className="mt-0.5 font-semibold text-navy-800">{CURRENT_TEXT[a.status]}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {a.vacancy.title} · <span className="text-slate-500">{a.vacancy.lecturer.fullName}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {a.status === "SUBMITTED" && <SlaBadge deadline={a.slaDeadline} />}
          <ApplicationStatusBadge status={a.status} />
        </div>
      </header>

      <div className="px-5 py-6">
        <StatusStepper steps={buildSteps(a)} />
      </div>

      {a.selectionNotes && (
        <div
          className={cn(
            "mx-5 mb-5 flex gap-3 rounded-lg px-4 py-3 text-sm",
            a.status === "REJECTED" ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900",
          )}
        >
          <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">
              {a.status === "REJECTED" ? "Alasan penolakan Dosen Peneliti" : "Catatan Dosen Peneliti"}
            </p>
            <p className="mt-0.5">{a.selectionNotes}</p>
            {a.status === "REJECTED" && (
              <Link
                href="/dashboard/student/vacancies"
                className="mt-2 inline-flex items-center gap-1 font-semibold text-red-800 hover:underline"
              >
                Cari lowongan riset lain <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {a.status === "REVISION_REQUIRED" && (
        <div className="mx-5 mb-5 space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex gap-3 text-sm text-orange-900">
            <RotateCcw className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Catatan revisi dari approver</p>
              <ul className="mt-1 space-y-1">
                {a.approvals
                  .filter((ap) => ap.status === "REJECTED")
                  .map((ap) => (
                    <li key={ap.id}>
                      <strong>{ROLE_LABEL[ap.approverRole]}</strong> ({ap.approver.fullName}): {ap.notes}
                    </li>
                  ))}
              </ul>
              <p className="mt-2 text-xs text-orange-800">Perbaiki dalam 2×24 jam agar jadwal KRS tidak terlewat (bpmn-tobe §8).</p>
            </div>
          </div>
          <RevisionForm applicationId={a.id} proposalTitle={a.proposalTitle} includesKp={a.includesKpConversion} />
        </div>
      )}

      {APPROVED_STATUSES.includes(a.status) && (
        <div className="mx-5 mb-5 flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 sm:flex-row sm:items-center">
          <QrCode className="size-5 shrink-0" aria-hidden />
          <p className="flex-1">
            <strong>E-Approval 3 pihak lengkap.</strong> Lembar pengesahan digital ber-QR telah terbit — 100% paperless,
            tanpa tanda tangan basah.
          </p>
          <Link
            href={`/dashboard/applications/${a.id}/pengesahan`}
            className="inline-flex items-center gap-1 font-semibold text-green-800 hover:underline"
          >
            Lihat Lembar Pengesahan <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {a.approvals.length > 0 && (
        <div className="mx-5 mb-5">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">E-Approval Simultan</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {a.approvals.map((ap) => (
              <li key={ap.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <p className="text-xs text-slate-500">{ROLE_LABEL[ap.approverRole] ?? ap.approverRole}</p>
                <p className="truncate font-medium text-slate-800">{ap.approver.fullName}</p>
                <p className="mt-1 flex items-center gap-1 text-xs">
                  {ap.status === "APPROVED" ? (
                    <CheckCircle2 className="size-3.5 text-green-600" />
                  ) : ap.status === "REJECTED" ? (
                    <XCircle className="size-3.5 text-red-600" />
                  ) : null}
                  {ap.status === "APPROVED" ? "Disetujui" : ap.status === "REJECTED" ? "Minta revisi" : "Menunggu"}
                  {ap.decidedAt && <span className="text-slate-400">· {formatDate(ap.decidedAt)}</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="grid gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500">Judul Rencana Riset</dt>
          <dd className="font-medium text-slate-800">{a.proposalTitle}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Paket Konversi</dt>
          <dd className="flex flex-wrap gap-1 pt-0.5">
            <StatusBadge tone="info" dot={false}>
              {scheme?.label ?? a.conversionScheme}
            </StatusBadge>
            {a.includesKpConversion && (
              <StatusBadge tone="neutral" dot={false}>
                + KP 2 SKS
              </StatusBadge>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">IPK saat mendaftar · Proposal</dt>
          <dd className="flex items-center gap-3">
            <span className="font-semibold tabular-nums">{Number(a.gpaAtApplication).toFixed(2)}</span>
            <a
              href={`/api/applications/${a.id}/proposal`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
            >
              <FileDown className="size-3.5" /> PDF
            </a>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; resubmitted?: string }>;
}) {
  const user = await requireRole("MAHASISWA");
  const { submitted, resubmitted } = await searchParams;
  await backfillApprovalForks();
  const applications = await listStudentApplications(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-800">Pelacak Status Pendaftaran</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pantau setiap tahap alur To-Be secara transparan — tidak perlu lagi menanyakan status lewat chat.
          </p>
        </div>
        <AutoRefresh />
      </div>

      {submitted && applications.some((a) => a.id === submitted) && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          Pendaftaran berhasil dikirim dan lolos verifikasi SIAKAD. Dosen Peneliti akan memutuskan dalam 7 hari kerja.
        </div>
      )}

      {resubmitted && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          Berkas revisi terkirim. Ketiga approver menerima permintaan persetujuan baru secara bersamaan.
        </div>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Route className="size-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-medium text-slate-700">Belum ada pendaftaran riset</p>
          <p className="mt-1 text-sm text-slate-500">Jelajahi katalog dan daftar ke lowongan riset yang Anda minati.</p>
          <Link
            href="/dashboard/student/vacancies"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-gold-400"
          >
            Buka Katalog Riset <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        applications.map((a) => <ApplicationCard key={a.id} a={a} highlight={a.id === submitted} />)
      )}
    </div>
  );
}
