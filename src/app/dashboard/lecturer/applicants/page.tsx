import Link from "next/link";
import { AlertCircle, CheckCircle2, FileDown, Inbox, XCircle } from "lucide-react";
import { SlaBadge } from "@/components/sla-badge";
import { ApplicationStatusBadge, QuotaBadge, StatusBadge, VacancyStatusBadge } from "@/components/status-badge";
import { listApplicantsForLecturer } from "@/lib/applications";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { slaStatus } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { DecisionDialog } from "./decision-dialog";

export const metadata = { title: "Seleksi Pelamar" };

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ vacancy?: string; decided?: string; name?: string; closed?: string; error?: string }>;
}) {
  const user = await requireRole("DOSEN_PENELITI");
  const sp = await searchParams;
  const all = await listApplicantsForLecturer(user.id);
  const vacancies = sp.vacancy ? all.filter((v) => v.id === sp.vacancy) : all;
  const filterValid = !sp.vacancy || vacancies.length > 0;

  const apps = all.flatMap((v) => v.applications);
  const pending = apps.filter((a) => a.status === "SUBMITTED");
  const urgent = pending.filter((a) => slaStatus(a.slaDeadline).state !== "on-track");
  const stats = [
    { label: "Menunggu keputusan", value: pending.length, tone: "text-amber-600" },
    { label: "Mendekati / lewat SLA", value: urgent.length, tone: urgent.length ? "text-red-600" : "text-navy-800" },
    { label: "Diterima", value: apps.filter((a) => a.status !== "SUBMITTED" && a.status !== "REJECTED").length, tone: "text-green-700" },
    { label: "Ditolak", value: apps.filter((a) => a.status === "REJECTED").length, tone: "text-navy-800" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Seleksi Pelamar Riset</h2>
        <p className="mt-1 text-sm text-slate-500">
          Putuskan setiap pelamar paling lambat 7 hari kerja sejak pendaftaran (BR-06). Keputusan langsung tampil di
          pelacak status mahasiswa.
        </p>
      </div>

      {sp.decided && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {sp.name ?? "Pelamar"} berhasil {sp.decided === "accepted" ? "diterima" : "ditolak"}.
            {sp.decided === "accepted" && " Status berubah menjadi DOSEN_ACCEPTED dan diteruskan ke tahap E-Approval."}
            {sp.closed && " Kuota riset kini penuh — lowongan ditutup otomatis."}
          </span>
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sp.error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan seleksi">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", s.tone)}>{s.value}</p>
          </div>
        ))}
      </section>

      {all.length > 1 && (
        <nav aria-label="Filter lowongan" className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/lecturer/applicants"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1",
              !sp.vacancy ? "bg-navy-800 text-white ring-navy-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50",
            )}
          >
            Semua lowongan
          </Link>
          {all.map((v) => (
            <Link
              key={v.id}
              href={`/dashboard/lecturer/applicants?vacancy=${v.id}`}
              title={v.title}
              className={cn(
                "max-w-64 truncate rounded-full px-3 py-1 text-xs font-medium ring-1",
                sp.vacancy === v.id ? "bg-navy-800 text-white ring-navy-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50",
              )}
            >
              {v.title} ({v.applications.filter((a) => a.status === "SUBMITTED").length})
            </Link>
          ))}
        </nav>
      )}

      {!filterValid || vacancies.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Inbox className="size-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-medium text-slate-700">Belum ada lowongan yang dipublikasikan</p>
          <Link href="/dashboard/lecturer/vacancies" className="mt-2 text-sm font-medium text-navy-600 hover:text-navy-800">
            Kelola lowongan riset →
          </Link>
        </div>
      ) : (
        vacancies.map((v) => (
          <section key={v.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-navy-800">{v.title}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{v.grantContractNumber}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <StatusBadge tone="neutral" dot={false}>
                  {v.applications.length} pelamar
                </StatusBadge>
                <QuotaBadge remaining={v.remainingQuota} quota={v.quota} />
                <VacancyStatusBadge status={v.status} />
              </div>
            </header>

            {v.applications.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada pelamar untuk lowongan ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Mahasiswa</th>
                      <th className="px-3 py-3">IPK</th>
                      <th className="px-3 py-3">Rencana Riset</th>
                      <th className="px-3 py-3">Proposal</th>
                      <th className="px-3 py-3">SLA / Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {v.applications.map((a) => (
                      <tr key={a.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{a.student.fullName}</p>
                          <p className="font-mono text-xs text-slate-500">NIM {a.student.nimNip}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Daftar {formatDate(a.createdAt)}</p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-semibold text-navy-800 tabular-nums">{Number(a.gpaAtApplication).toFixed(2)}</span>
                          <p className="text-[11px] text-green-700">SIAKAD ✓</p>
                        </td>
                        <td className="max-w-xs px-3 py-4">
                          <p className="line-clamp-2 text-slate-700">{a.proposalTitle}</p>
                          <p className="mt-1 flex flex-wrap gap-1">
                            <StatusBadge tone="info" dot={false}>{a.conversionScheme} · 20 SKS</StatusBadge>
                            {a.includesKpConversion && <StatusBadge tone="neutral" dot={false}>+ KP 2 SKS</StatusBadge>}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <a
                            href={`/api/applications/${a.id}/proposal`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
                          >
                            <FileDown className="size-3.5" /> Unduh PDF
                          </a>
                        </td>
                        <td className="px-3 py-4">
                          {a.status === "SUBMITTED" ? (
                            <SlaBadge deadline={a.slaDeadline} showDate />
                          ) : (
                            <div className="space-y-1">
                              <ApplicationStatusBadge status={a.status} />
                              {a.selectionNotes && (
                                <p className="max-w-56 text-xs text-slate-500 italic">“{a.selectionNotes}”</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {a.status === "SUBMITTED" ? (
                            <DecisionDialog
                              applicationId={a.id}
                              studentName={a.student.fullName}
                              nim={a.student.nimNip}
                              vacancyFilter={sp.vacancy}
                              canAccept={v.remainingQuota > 0}
                              remainingQuota={v.remainingQuota}
                            />
                          ) : (
                            <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                              {a.status === "REJECTED" ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                              {a.selectionDecidedAt ? `Diputuskan ${formatDate(a.selectionDecidedAt)}` : "Sudah diputuskan"}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
