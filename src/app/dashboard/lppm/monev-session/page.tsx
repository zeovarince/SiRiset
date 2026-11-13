import Link from "next/link";
import { CheckCircle2, ClipboardList, FileDown, Hourglass, Inbox, UserX } from "lucide-react";
import { MonevResult } from "@/components/monev-result";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { MONEV_WEEK, listMonevSession, monevGrade } from "@/lib/monev";
import { cn } from "@/lib/utils";
import { EvaluationForm } from "./evaluation-form";

export const metadata = { title: "Sesi Monev" };

const isoLabel = (iso: string) => formatDate(new Date(`${iso}T12:00:00+07:00`));

/** Dasbor Evaluasi Monev Reviewer LPPM (FR-07.2, FR-07.3). */
export default async function MonevSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; evaluated?: string }>;
}) {
  const user = await requireRole("LPPM_REVIEWER");
  const sp = await searchParams;
  const { submitted, missing, upcoming } = await listMonevSession();

  const isEvaluatedByMe = (r: (typeof submitted)[number]) =>
    r.report!.monevEvaluations.some((e) => e.reviewerId === user.id);
  const pending = submitted.filter((r) => !isEvaluatedByMe(r));
  const evaluatedAll = submitted.flatMap((r) => r.report!.monevEvaluations);
  const avg = evaluatedAll.length
    ? evaluatedAll.reduce((n, e) => n + monevGrade(e).average, 0) / evaluatedAll.length
    : null;

  const selected =
    submitted.find((r) => r.report!.id === sp.report) ?? pending[0] ?? submitted[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Sesi Monitoring & Evaluasi (Monev) LPPM</h2>
        <p className="mt-1 text-sm text-slate-500">
          Laporan kemajuan minggu ke-{MONEV_WEEK} dan rekap logbook mahasiswa tersedia langsung di sini — tanpa Google
          Classroom terpisah.
        </p>
      </div>

      {sp.evaluated && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Penilaian tersimpan di monev_evaluations dan langsung tampil di dasbor Dosen Peneliti & Mahasiswa.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan sesi monev">
        {[
          { label: "Laporan kemajuan masuk", value: String(submitted.length), cls: "text-navy-800" },
          { label: "Menunggu penilaian Anda", value: String(pending.length), cls: pending.length ? "text-amber-600" : "text-navy-800" },
          { label: "Belum mengumpulkan (≥ M8)", value: String(missing.length), cls: missing.length ? "text-red-600" : "text-navy-800" },
          { label: "Rata-rata nilai monev", value: avg === null ? "—" : avg.toFixed(1), cls: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", s.cls)}>{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-800">Proyek Riset dengan Laporan Kemajuan</h3>
            {submitted.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Inbox className="size-4" /> Belum ada laporan masuk.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {submitted.map((r) => {
                  const mine = isEvaluatedByMe(r);
                  const active = selected?.report!.id === r.report!.id;
                  return (
                    <li key={r.report!.id}>
                      <Link
                        href={`?report=${r.report!.id}`}
                        aria-current={active ? "true" : undefined}
                        className={cn("block px-4 py-3 hover:bg-slate-50", active && "bg-gold-50/70 ring-1 ring-gold-300 ring-inset")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-900">{r.app.student.fullName}</p>
                          {mine ? (
                            <StatusBadge tone="success">Dinilai</StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Menunggu</StatusBadge>
                          )}
                        </div>
                        <p className="line-clamp-1 text-xs text-slate-500">{r.app.vacancy.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Capaian {Number(r.report!.estimatedPercentage).toFixed(0)}% · diunggah {formatDate(r.report!.submittedAt)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {missing.length > 0 && (
            <section className="rounded-xl border border-red-200 bg-white shadow-sm">
              <h3 className="flex items-center gap-2 border-b border-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                <UserX className="size-4" /> Belum Mengumpulkan Laporan
              </h3>
              <ul className="divide-y divide-slate-100 text-sm">
                {missing.map((r) => (
                  <li key={r.app.id} className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{r.app.student.fullName}</p>
                    <p className="text-xs text-slate-500">
                      Minggu ke-{Math.min(r.window.currentWeek, 16)} · {r.app.vacancy.lecturer.fullName}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {upcoming.length > 0 && (
            <p className="flex items-start gap-2 px-1 text-xs text-slate-500">
              <Hourglass className="mt-0.5 size-3.5 shrink-0" />
              {upcoming.length} peserta lain belum mencapai minggu ke-{MONEV_WEEK} (
              {upcoming.map((r) => `${r.app.student.fullName}: ${isoLabel(r.window.opensOn)}`).join("; ")}).
            </p>
          )}
        </aside>

        {selected ? (
          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {selected.app.student.fullName} ({selected.app.student.nimNip}) · Pembimbing {selected.app.vacancy.lecturer.fullName}
                </p>
                <h3 className="mt-1 font-semibold text-navy-800">{selected.report!.reportTitle}</h3>
                <p className="text-xs text-slate-500">
                  {selected.app.vacancy.title} · <span className="font-mono">{selected.app.vacancy.grantContractNumber}</span>
                </p>
              </div>
              <a
                href={`/api/monev/reports/${selected.report!.id}/file`}
                target="_blank"
                rel="noopener"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
              >
                <FileDown className="size-4" /> Unduh Laporan PDF
              </a>
            </header>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ringkasan Eksekutif</p>
                <p className="mt-1 text-sm whitespace-pre-line text-slate-800">{selected.report!.researchProgressSummary}</p>
                <p className="mt-2 text-xs text-slate-500">Diunggah {formatDateTime(selected.report!.submittedAt)}</p>
              </div>
              <div className="rounded-xl bg-navy-50 px-5 py-3 text-center">
                <p className="text-[11px] text-slate-500">Estimasi capaian</p>
                <p className="text-3xl font-bold text-navy-800 tabular-nums">{Number(selected.report!.estimatedPercentage).toFixed(0)}%</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <ClipboardList className="size-3.5" /> Rekapitulasi Logbook Minggu 1–{MONEV_WEEK}
                </p>
                <span className="flex flex-wrap gap-1.5">
                  <StatusBadge tone={(selected.recap.compliance.rate ?? 0) >= 90 ? "success" : "warning"}>
                    Kepatuhan {selected.recap.compliance.rate === null ? "—" : `${selected.recap.compliance.rate.toFixed(1)}%`}
                  </StatusBadge>
                  <StatusBadge tone="neutral" dot={false}>{selected.recap.totalHours} jam</StatusBadge>
                  <StatusBadge tone="neutral" dot={false}>{selected.recap.validated}/{MONEV_WEEK} divalidasi</StatusBadge>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs">
                  <thead className="bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Minggu</th>
                      <th className="px-3 py-2">Periode</th>
                      <th className="px-3 py-2">Jam</th>
                      <th className="px-3 py-2">Status Logbook</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.recap.weeks.map(({ window: w, entry, passed }) => (
                      <tr key={w.week}>
                        <td className="px-3 py-1.5 font-mono font-semibold text-navy-700">M-{String(w.week).padStart(2, "0")}</td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {isoLabel(w.monday)} – {isoLabel(w.sunday)}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{entry ? `${entry.durationHours} j` : "—"}</td>
                        <td className="px-3 py-1.5">
                          {entry ? (
                            <span className="flex flex-wrap gap-1">
                              <StatusBadge tone={entry.status === "VALIDATED" ? "success" : entry.status === "REVISION_NEEDED" ? "warning" : "info"}>
                                {entry.status === "VALIDATED" ? "Valid" : entry.status === "REVISION_NEEDED" ? "Perlu revisi" : "Menunggu ulasan"}
                              </StatusBadge>
                              {entry.isLate && <StatusBadge tone="danger" dot={false}>Terlambat</StatusBadge>}
                            </span>
                          ) : passed ? (
                            <StatusBadge tone="danger">Tidak diisi</StatusBadge>
                          ) : (
                            <span className="text-slate-400">Berjalan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {isEvaluatedByMe(selected) ? null : (
              <EvaluationForm key={selected.report!.id} reportId={selected.report!.id} />
            )}

            {selected.report!.monevEvaluations.length > 0 && (
              <div className="space-y-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Hasil Penilaian Sesi Monev</p>
                {selected.report!.monevEvaluations.map((e) => (
                  <MonevResult key={e.id} evaluation={e} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Inbox className="size-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">Belum ada laporan kemajuan untuk dinilai</p>
            <p className="mt-1 text-sm text-slate-500">Laporan muncul otomatis saat mahasiswa mengunggah di minggu ke-{MONEV_WEEK}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
