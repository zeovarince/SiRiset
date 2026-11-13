import Link from "next/link";
import { CalendarClock, CheckCircle2, FileDown, FileText, Hourglass, Lock } from "lucide-react";
import { MonevResult } from "@/components/monev-result";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { getStudentResearch } from "@/lib/logbooks";
import { MONEV_WEEK, getReportForApplication, logbookRecap, monevWindow } from "@/lib/monev";
import { ReportForm } from "./report-form";

export const metadata = { title: "Laporan Kemajuan" };

const isoLabel = (iso: string) => formatDate(new Date(`${iso}T12:00:00+07:00`));

/** Hub unggah Laporan Kemajuan & hasil Monev LPPM — tanpa Google Classroom (FR-07). */
export default async function StudentMonevPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireRole("MAHASISWA");
  const { saved } = await searchParams;
  const research = await getStudentResearch(user.id);

  if (!research) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <FileText className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">Modul monev belum aktif</p>
        <p className="mt-1 text-sm text-slate-500">Tersedia setelah riset Anda berstatus aktif (divalidasi Koordinator MBKM).</p>
      </div>
    );
  }

  const { app, startDate } = research;
  const monev = monevWindow(startDate);
  const report = await getReportForApplication(app.id);
  const evaluations = report?.monevEvaluations ?? [];
  const recap = logbookRecap(startDate, app.logbooks);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Laporan Kemajuan & Monev LPPM</h2>
        <p className="mt-1 text-sm text-slate-500">
          Unggah laporan kemajuan langsung di SiRiset — tidak perlu lagi mengumpulkan via Google Classroom terpisah.
        </p>
      </div>

      {saved && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {saved === "created" ? "Laporan kemajuan berhasil diunggah." : "Laporan kemajuan berhasil diperbarui."}
        </div>
      )}

      {/* Status utama */}
      {evaluations.length > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          <CheckCircle2 className="size-4 shrink-0" /> Laporan Kemajuan telah dinilai pada Seminar Monev LPPM
        </div>
      ) : report ? (
        <div className="flex items-center gap-2 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3 text-sm font-semibold text-navy-800">
          <Hourglass className="size-4 shrink-0" /> Laporan Kemajuan Terunggah — Menunggu Penilaian Seminar Monev LPPM
        </div>
      ) : monev.open ? (
        <div className="flex items-center gap-2 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-navy-900">
          <CalendarClock className="size-4 shrink-0 text-gold-600" />
          <span>
            <strong>Jendela Monev dibuka</strong> (minggu ke-{Math.min(monev.currentWeek, 16)}). Segera unggah laporan kemajuan
            sesuai templat LPPM UTM.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Lock className="size-4 shrink-0" />
          Jendela unggah laporan kemajuan terbuka pada minggu ke-{MONEV_WEEK} ({isoLabel(monev.opensOn)}) —{" "}
          {monev.weeksUntil} minggu lagi. Saat ini minggu ke-{Math.max(monev.currentWeek, 0)}.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Kesiapan monev">
        {[
          { label: "Minggu berjalan", value: `${Math.min(Math.max(monev.currentWeek, 0), 16)} / 16` },
          { label: "Logbook minggu 1–8", value: `${recap.filled} / ${MONEV_WEEK}` },
          { label: "Kepatuhan logbook (M1–8)", value: recap.compliance.rate === null ? "—" : `${recap.compliance.rate.toFixed(1)}%` },
          { label: "Jam riset tercatat (M1–8)", value: `${recap.totalHours} jam` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-navy-800 tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      {evaluations.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-navy-800">Hasil Penilaian Sesi Monev LPPM</h3>
          <div className="space-y-6">
            {evaluations.map((e) => (
              <MonevResult key={e.id} evaluation={e} />
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Gunakan rekomendasi reviewer sebagai dasar perbaikan pada paruh kedua riset (minggu 9–16).
          </p>
        </section>
      )}

      {report && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Laporan Terunggah</p>
              <h3 className="mt-1 font-semibold text-navy-800">{report.reportTitle}</h3>
              <p className="text-xs text-slate-500">Diunggah {formatDateTime(report.submittedAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge tone="info" dot={false}>
                Capaian {Number(report.estimatedPercentage).toFixed(0)}%
              </StatusBadge>
              <a
                href={`/api/monev/reports/${report.id}/file`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
              >
                <FileDown className="size-3.5" /> PDF
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm whitespace-pre-line text-slate-700">{report.researchProgressSummary}</p>
        </section>
      )}

      {monev.open && evaluations.length === 0 && app.status === "IN_PROGRESS" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-navy-800">{report ? "Perbarui Laporan Kemajuan" : "Formulir Unggah Laporan Kemajuan"}</h3>
          <ReportForm
            key={report?.id ?? "new"}
            applicationId={app.id}
            hasFile={Boolean(report)}
            defaults={{
              reportTitle: report?.reportTitle ?? "",
              researchProgressSummary: report?.researchProgressSummary ?? "",
              estimatedPercentage: report ? String(Number(report.estimatedPercentage)) : "",
            }}
          />
        </section>
      )}

      <p className="text-center text-xs text-slate-500">
        Rekap logbook Anda otomatis tersedia bagi Reviewer LPPM.{" "}
        <Link href="/dashboard/student/logbook" className="font-medium text-navy-600 hover:underline">
          Lihat logbook →
        </Link>
      </p>
    </div>
  );
}
