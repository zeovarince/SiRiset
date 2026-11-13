import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, Briefcase, CheckCircle2, Pencil, Send, Trash2, Users, XCircle } from "lucide-react";
import { QuotaBadge, VacancyStatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { daysUntil, formatDate, toDateInputValue, todayWIB } from "@/lib/format";
import { listLecturerVacancies, type LecturerVacancy } from "@/lib/vacancies";
import { QUOTA_MAX, type VacancyFormValues } from "@/lib/vacancy-schema";
import { cn } from "@/lib/utils";
import { closeVacancyAction, deleteVacancyAction, publishVacancyAction } from "./actions";
import { VacancyForm, type EditingVacancy } from "./vacancy-form";

export const metadata = { title: "Lowongan Riset Saya" };

const SAVED_MESSAGES: Record<string, string> = {
  published: "Lowongan riset berhasil dipublikasikan dan kini tampil di Katalog Riset mahasiswa.",
  draft: "Lowongan disimpan sebagai draf. Publikasikan bila sudah siap.",
  updated: "Perubahan lowongan berhasil disimpan.",
  closed: "Pendaftaran lowongan telah ditutup.",
  deleted: "Draf lowongan telah dihapus.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "not-found": "Lowongan tidak ditemukan atau bukan milik Anda.",
  "invalid-status": "Aksi tidak dapat dilakukan pada status lowongan saat ini.",
  expired: "Tanggal tutup pendaftaran sudah lewat. Edit tanggal tutup terlebih dahulu.",
  "quota-full": "Kuota sudah terpenuhi. Naikkan kuota terlebih dahulu untuk membuka kembali.",
  "has-applicants": "Draf yang sudah memiliki pendaftar tidak dapat dihapus.",
};

function plusDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyDefaults(): VacancyFormValues {
  const today = todayWIB();
  return {
    title: "",
    grantContractNumber: "",
    grantScheme: "",
    description: "",
    quota: String(QUOTA_MAX),
    requiredSkills: [],
    applicationStartDate: today,
    applicationEndDate: plusDays(today, 14),
  };
}

function toEditing(v: LecturerVacancy): EditingVacancy {
  return {
    id: v.id,
    status: v.status,
    applicantCount: v.applicantCount,
    title: v.title,
    grantContractNumber: v.grantContractNumber,
    grantScheme: v.grantScheme,
    description: v.description,
    quota: String(v.quota),
    requiredSkills: v.skills,
    applicationStartDate: toDateInputValue(v.applicationStartDate),
    applicationEndDate: toDateInputValue(v.applicationEndDate),
  };
}

function RowAction({
  action,
  icon: Icon,
  label,
  tone = "default",
}: {
  action: () => Promise<void>;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "default" | "danger" | "primary";
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        title={label}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
          tone === "danger" && "text-red-600 hover:bg-red-50",
          tone === "primary" && "text-green-700 hover:bg-green-50",
          tone === "default" && "text-slate-600 hover:bg-slate-100",
        )}
      >
        <Icon className="size-3.5" />
        {label}
      </button>
    </form>
  );
}

export default async function LecturerVacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string; error?: string }>;
}) {
  const user = await requireRole("DOSEN_PENELITI");
  const { edit, saved, error } = await searchParams;
  const vacancies = await listLecturerVacancies(user.id);

  const editingRow = edit ? vacancies.find((v) => v.id === edit) : undefined;
  if (edit && !editingRow) notFound();

  const openCount = vacancies.filter((v) => v.status === "PUBLISHED").length;
  const totalApplicants = vacancies.reduce((n, v) => n + v.applicantCount, 0);
  const openSeats = vacancies.filter((v) => v.status === "PUBLISHED").reduce((n, v) => n + v.remainingQuota, 0);

  const stats = [
    { label: "Total lowongan", value: vacancies.length },
    { label: "Sedang dibuka", value: openCount },
    { label: "Total pendaftar", value: totalApplicants },
    { label: "Sisa kuota terbuka", value: openSeats },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Manajemen Lowongan Riset</h2>
        <p className="mt-1 text-sm text-slate-500">
          Publikasikan penawaran riset hibah LPPM secara resmi, pantau pendaftar, dan kelola kuota mahasiswa.
        </p>
      </div>

      {saved && SAVED_MESSAGES[saved] && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {SAVED_MESSAGES[saved]}
        </div>
      )}
      {error && ERROR_MESSAGES[error] && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {ERROR_MESSAGES[error]}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan lowongan">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-800 tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <VacancyForm
        key={editingRow?.id ?? "new"}
        editing={editingRow ? toEditing(editingRow) : undefined}
        defaults={emptyDefaults()}
        defaultOpen={vacancies.length === 0}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-navy-800">Daftar Lowongan Saya</h3>
        </div>

        {vacancies.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <Briefcase className="size-10 text-slate-300" aria-hidden />
            <p className="mt-3 font-medium text-slate-700">Belum ada lowongan riset</p>
            <p className="mt-1 text-sm text-slate-500">Gunakan formulir di atas untuk mempublikasikan lowongan pertama Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Lowongan Riset</th>
                  <th className="px-3 py-3">Periode Pendaftaran</th>
                  <th className="px-3 py-3 text-center">Pendaftar</th>
                  <th className="px-3 py-3">Kuota</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacancies.map((v) => {
                  const ended = daysUntil(v.applicationEndDate) < 0;
                  const notStarted = v.applicationStartDate > new Date();
                  return (
                    <tr key={v.id} className={cn("align-top", editingRow?.id === v.id && "bg-gold-50/50")}>
                      <td className="max-w-md px-5 py-4">
                        <p className="line-clamp-2 font-medium text-slate-900">{v.title}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{v.grantContractNumber}</p>
                        <p className="text-xs text-slate-500">{v.grantScheme}</p>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                        <p>
                          {formatDate(v.applicationStartDate)} – {formatDate(v.applicationEndDate)}
                        </p>
                        <p className={cn("mt-0.5 text-xs", ended ? "text-red-600" : "text-slate-500")}>
                          {ended
                            ? "Periode berakhir"
                            : notStarted
                              ? "Belum dibuka"
                              : v.daysLeft === 0
                                ? "Ditutup hari ini"
                                : `${v.daysLeft} hari lagi`}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <p className="text-base font-semibold text-navy-800 tabular-nums">{v.applicantCount}</p>
                        <p className="text-xs text-slate-500">{v.acceptedCount} diterima</p>
                      </td>
                      <td className="px-3 py-4">
                        <QuotaBadge remaining={v.remainingQuota} quota={v.quota} />
                      </td>
                      <td className="px-3 py-4">
                        <VacancyStatusBadge status={v.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Link
                            href={`/dashboard/lecturer/vacancies?edit=${v.id}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 hover:bg-navy-50"
                          >
                            <Pencil className="size-3.5" /> Edit
                          </Link>
                          <Link
                            href={`/dashboard/lecturer/applicants?vacancy=${v.id}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            <Users className="size-3.5" /> Pelamar
                          </Link>
                          {v.status === "PUBLISHED" && (
                            <RowAction action={closeVacancyAction.bind(null, v.id)} icon={XCircle} label="Tutup" tone="danger" />
                          )}
                          {(v.status === "DRAFT" || v.status === "CLOSED") && !ended && v.remainingQuota > 0 && (
                            <RowAction
                              action={publishVacancyAction.bind(null, v.id)}
                              icon={Send}
                              label={v.status === "DRAFT" ? "Publikasikan" : "Buka Kembali"}
                              tone="primary"
                            />
                          )}
                          {v.status === "DRAFT" && v.applicantCount === 0 && (
                            <RowAction action={deleteVacancyAction.bind(null, v.id)} icon={Trash2} label="Hapus" tone="danger" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
