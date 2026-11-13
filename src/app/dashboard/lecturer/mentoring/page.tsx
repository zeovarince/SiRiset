import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileDown,
  FileImage,
  GitCommitHorizontal,
  Hourglass,
  Inbox,
  RotateCcw,
  Users,
} from "lucide-react";
import { LogbookEntry } from "@/components/logbook-entry";
import { MonevResult } from "@/components/monev-result";
import { MONEV_WEEK, getReportForApplication, monevWindow } from "@/lib/monev";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { TOTAL_WEEKS } from "@/lib/logbook-schedule";
import { WEEK_STATE, listMentees, weekState } from "@/lib/logbooks";
import { cn } from "@/lib/utils";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Mentoring Logbook" };

const isoLabel = (iso: string) => formatDate(new Date(`${iso}T12:00:00+07:00`));

function complianceTone(rate: number | null) {
  if (rate === null) return "neutral" as const;
  return rate >= 90 ? ("success" as const) : rate >= 75 ? ("warning" as const) : ("danger" as const);
}

/** Layar 4 — Dasbor Monitoring Logbook Mingguan & Inline Mentoring (FR-06.2, FR-06.3). */
export default async function MentoringPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; week?: string; reviewed?: string; error?: string }>;
}) {
  const user = await requireRole("DOSEN_PENELITI");
  const sp = await searchParams;
  const mentees = await listMentees(user.id);

  if (mentees.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Users className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">Belum ada mahasiswa bimbingan aktif</p>
        <p className="mt-1 text-sm text-slate-500">Mahasiswa muncul setelah divalidasi Koordinator MBKM (Riset Aktif).</p>
      </div>
    );
  }

  const selected =
    mentees.find((m) => m.app.id === sp.student) ?? mentees.find((m) => m.pendingReview > 0) ?? mentees[0];
  const byWeek = new Map(selected.app.logbooks.map((l) => [l.weekNumber, l]));
  const requestedWeek = Number(sp.week);
  const firstPending = selected.app.logbooks.find((l) => l.status === "SUBMITTED")?.weekNumber;
  const week =
    Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= TOTAL_WEEKS
      ? requestedWeek
      : (firstPending ?? Math.min(Math.max(selected.current, 1), TOTAL_WEEKS));
  const w = selected.weeks[week - 1];
  const entry = byWeek.get(week);
  const report = await getReportForApplication(selected.app.id);
  const monev = monevWindow(selected.startDate);
  const totalPending = mentees.reduce((n, m) => n + m.pendingReview, 0);
  const href = (q: Record<string, string | number>) =>
    `?${new URLSearchParams({ student: selected.app.id, ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Monitoring Logbook Mahasiswa Bimbingan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Visibilitas penuh atas catatan riset mingguan mahasiswa (minggu 1–16) beserta ruang bimbingan langsung.
          {totalPending > 0 && <strong className="text-navy-800"> {totalPending} logbook menunggu ulasan Anda.</strong>}
        </p>
      </div>

      {sp.reviewed && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {sp.reviewed === "APPROVED" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <RotateCcw className="mt-0.5 size-4 shrink-0" />}
          {sp.reviewed === "APPROVED"
            ? `Logbook minggu ke-${week} divalidasi. Catatan bimbingan tampil di akun mahasiswa.`
            : `Logbook minggu ke-${week} dikembalikan untuk revisi beserta arahan Anda.`}
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {sp.error}
        </div>
      )}

      <nav aria-label="Mahasiswa bimbingan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mentees.map((m) => {
          const active = m.app.id === selected.app.id;
          return (
            <Link
              key={m.app.id}
              href={`?student=${m.app.id}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-xl border bg-white p-4 shadow-sm transition hover:border-navy-300",
                active ? "border-navy-600 ring-2 ring-navy-600/20" : "border-slate-200",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-800">{m.app.student.fullName}</p>
                  <p className="font-mono text-xs text-slate-500">{m.app.student.nimNip}</p>
                </div>
                {m.pendingReview > 0 && (
                  <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-bold text-navy-900">
                    {m.pendingReview} baru
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-slate-500">Kepatuhan logbook</p>
                  <StatusBadge tone={complianceTone(m.compliance.rate)}>
                    {m.compliance.rate === null ? "Belum ada" : `${m.compliance.rate.toFixed(1)}% Tepat Waktu`}
                  </StatusBadge>
                </div>
                <p className="text-right text-xs text-slate-500">
                  Minggu ke-{Math.min(Math.max(m.current, 1), TOTAL_WEEKS)} dari {TOTAL_WEEKS}
                  <span className="block">{m.totalHours} jam tercatat</span>
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Hasil Monev LPPM">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-navy-800">Hasil Monev LPPM · {selected.app.student.fullName}</h3>
          {report && (
            <a
              href={`/api/monev/reports/${report.id}/file`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900"
            >
              <FileDown className="size-3.5" /> Laporan kemajuan ({Number(report.estimatedPercentage).toFixed(0)}%)
            </a>
          )}
        </div>
        {report && report.monevEvaluations.length > 0 ? (
          <div className="space-y-5">
            {report.monevEvaluations.map((e) => (
              <MonevResult key={e.id} evaluation={e} />
            ))}
          </div>
        ) : report ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Hourglass className="size-4" /> Laporan kemajuan terunggah {formatDate(report.submittedAt)} — menunggu penilaian
            Seminar Monev LPPM.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Hourglass className="size-4" />
            {monev.open
              ? "Jendela monev sudah dibuka — mahasiswa belum mengunggah laporan kemajuan."
              : `Jendela unggah laporan kemajuan terbuka pada minggu ke-${MONEV_WEEK} (${isoLabel(monev.opensOn)}).`}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-navy-800">
              {selected.app.student.fullName} <span className="font-mono text-xs text-slate-500">({selected.app.student.nimNip})</span>
            </p>
            <p className="line-clamp-1 text-xs text-slate-500">Judul: {selected.app.proposalTitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <StatusBadge tone={complianceTone(selected.compliance.rate)}>
              Kepatuhan: {selected.compliance.rate === null ? "—" : `${selected.compliance.rate.toFixed(1)}% Tepat Waktu`}
            </StatusBadge>
            <StatusBadge tone="neutral" dot={false}>
              Minggu ke-{Math.min(Math.max(selected.current, 1), TOTAL_WEEKS)} dari {TOTAL_WEEKS}
            </StatusBadge>
            {selected.compliance.missing > 0 && (
              <StatusBadge tone="danger" dot={false}>{selected.compliance.missing} minggu tidak diisi</StatusBadge>
            )}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2.5">Minggu</th>
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Jam</th>
                <th className="px-3 py-2.5">Ringkasan Aktivitas</th>
                <th className="px-3 py-2.5">Bukti / Repo</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selected.weeks.map((wk) => {
                const l = byWeek.get(wk.week);
                const st = weekState(wk, l, selected.current);
                if (st === "LOCKED" && wk.week > selected.current + 1) return null;
                return (
                  <tr key={wk.week} className={cn("hover:bg-slate-50", wk.week === week && "bg-gold-50/60")}>
                    <td className="px-5 py-2.5">
                      <Link href={href({ week: wk.week })} className="font-mono font-semibold text-navy-700 hover:underline">
                        M-{String(wk.week).padStart(2, "0")}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                      {l ? formatDate(l.activityDate) : isoLabel(wk.monday)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 tabular-nums">{l ? `${l.durationHours} j` : "—"}</td>
                    <td className="max-w-xs px-3 py-2.5">
                      <Link href={href({ week: wk.week })} className="line-clamp-1 text-slate-800 hover:text-navy-700">
                        {l?.activityDescription ?? <span className="text-slate-400">—</span>}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex gap-2 text-slate-500">
                        {l?.evidenceFileUrl && <FileImage className="size-4" aria-label="Berkas bukti" />}
                        {l?.repositoryLink && <GitCommitHorizontal className="size-4" aria-label="Tautan repositori" />}
                        {!l && "—"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="flex flex-wrap items-center gap-1">
                        <StatusBadge tone={WEEK_STATE[st].tone}>{WEEK_STATE[st].label}</StatusBadge>
                        {l?.isLate && <StatusBadge tone="danger" dot={false}>Terlambat</StatusBadge>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Detail Logbook Minggu ke-{week} · {isoLabel(w.monday)} – {isoLabel(w.sunday)}
            {entry?.status === "SUBMITTED" && <span className="ml-2 text-gold-700">(menunggu ulasan Anda)</span>}
          </p>
          {entry ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
              <LogbookEntry logbook={entry} window={w} />
              {entry.status === "SUBMITTED" ? (
                <ReviewForm logbookId={entry.id} applicationId={selected.app.id} week={week} />
              ) : (
                <p className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {entry.status === "VALIDATED"
                    ? "Logbook ini sudah Anda validasi dan terhitung dalam rekap kepatuhan."
                    : "Menunggu mahasiswa memperbaiki logbook sesuai arahan Anda."}
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Inbox className="size-4" /> Mahasiswa belum mengisi logbook minggu ini.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
