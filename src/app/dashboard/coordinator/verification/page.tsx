import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, FileDown, Inbox, QrCode, RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { validateApplicationAction } from "@/app/actions/coordinator";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { getSyncOverview, listAwaitingValidation } from "@/lib/coordinator";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Validasi Prodi" };

function hoursLabel(h: number | null) {
  if (h === null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} menit`;
  if (h < 48) return `${h.toFixed(1)} jam`;
  return `${(h / 24).toFixed(1)} hari`;
}

/** Dasbor Koordinator MBKM — verifikasi daring & validasi akhir prodi (bpmn-tobe §4.4). */
export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ validated?: string; error?: string }>;
}) {
  await requireRole("KOORDINATOR_MBKM");
  const sp = await searchParams;
  const [awaiting, sync] = await Promise.all([listAwaitingValidation(), getSyncOverview()]);

  const leadTimes = awaiting.map((a) => a.approvalLeadHours).filter((h): h is number => h !== null);
  const avgLead = leadTimes.length ? leadTimes.reduce((s, h) => s + h, 0) / leadTimes.length : null;
  const readyToSync = sync.pendingCount + sync.mismatchCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Verifikasi Daring & Validasi Akhir Prodi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Berkas yang lolos E-Approval 3 pihak diperiksa secara daring — tanpa map fisik. Validasi akhir mengaktifkan
          status riset mahasiswa.
        </p>
      </div>

      {sp.validated && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 sm:flex-row sm:items-center">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <p className="flex-1">
            <strong>{sp.validated}</strong> resmi menjadi peserta riset aktif (status <code>IN_PROGRESS</code>).
          </p>
          <Link href="/dashboard/coordinator/sync-simpelmas" className="inline-flex items-center gap-1 font-semibold hover:underline">
            Sinkronkan ke SIMPELMAS <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sp.error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan">
        {[
          { label: "Menunggu validasi prodi", value: String(awaiting.length), cls: "text-amber-600" },
          { label: "Peserta riset aktif tervalidasi", value: String(sync.verifiedCount), cls: "text-green-700" },
          { label: "Rata-rata waktu E-Approval", value: hoursLabel(avgLead), cls: "text-navy-800" },
          {
            label: "Siap disinkronkan ke LPPM",
            value: String(readyToSync),
            cls: readyToSync ? "text-amber-600" : "text-navy-800",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", s.cls)}>{s.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">
          Berkas E-Approval Lengkap (APPROVAL_COMPLETE)
        </h3>
        {awaiting.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <Inbox className="size-10 text-slate-300" aria-hidden />
            <p className="mt-3 font-medium text-slate-700">Tidak ada berkas yang menunggu validasi</p>
            <p className="mt-1 text-sm text-slate-500">Berkas muncul otomatis setelah ketiga approver menyetujui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Mahasiswa</th>
                  <th className="px-3 py-3">Riset & Dosen Peneliti</th>
                  <th className="px-3 py-3">E-Approval</th>
                  <th className="px-3 py-3">Integritas Dokumen</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {awaiting.map((a) => (
                  <tr key={a.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{a.student.fullName}</p>
                      <p className="font-mono text-xs text-slate-500">{a.student.nimNip}</p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge tone="info" dot={false}>IPK {Number(a.gpaAtApplication).toFixed(2)}</StatusBadge>
                        {a.includesKpConversion && <StatusBadge tone="neutral" dot={false}>+ KP</StatusBadge>}
                      </p>
                    </td>
                    <td className="max-w-sm px-3 py-4">
                      <p className="line-clamp-2 text-slate-800">{a.vacancy.title}</p>
                      <p className="text-xs text-slate-500">{a.vacancy.lecturer.fullName}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500 italic">Rencana: {a.proposalTitle}</p>
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge tone="success">Lengkap (3/3)</StatusBadge>
                      <p className="mt-1 text-xs text-slate-500">Selesai dalam {hoursLabel(a.approvalLeadHours)}</p>
                    </td>
                    <td className="px-3 py-4">
                      {a.certificateValid ? (
                        <p className="flex items-center gap-1 text-xs font-semibold text-green-700">
                          <ShieldCheck className="size-4" /> Stempel QR valid
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-xs font-semibold text-red-700">
                          <ShieldAlert className="size-4" /> Data berubah setelah disahkan
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/dashboard/applications/${a.id}/pengesahan`}
                          className="inline-flex items-center gap-1 font-medium text-navy-700 hover:text-navy-900"
                        >
                          <QrCode className="size-3.5" /> Lembar pengesahan
                        </Link>
                        <a
                          href={`/api/applications/${a.id}/proposal`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 font-medium text-navy-700 hover:text-navy-900"
                        >
                          <FileDown className="size-3.5" /> Proposal
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <form action={validateApplicationAction}>
                        <input type="hidden" name="applicationId" value={a.id} />
                        <ConfirmSubmit
                          disabled={!a.certificateValid}
                          confirmMessage={`Validasi akhir prodi untuk ${a.student.fullName}? Status akan berubah menjadi Riset Aktif (IN_PROGRESS).`}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          <ShieldCheck className="size-4" /> Validasi Akhir Prodi
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-navy-800">Peserta Riset Aktif Tervalidasi</h3>
          <Link
            href="/dashboard/coordinator/sync-simpelmas"
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-navy-900"
          >
            <RefreshCcw className="size-4" /> Pusat Sinkronisasi SIMPELMAS
          </Link>
        </div>
        {sync.rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada peserta yang divalidasi.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sync.rows.map((r) => (
              <li key={r.app.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
                <span className="font-mono text-xs text-slate-500">{r.app.student.nimNip}</span>
                <span className="flex-1 font-medium text-slate-800">{r.app.student.fullName}</span>
                <span className="text-xs text-slate-500">
                  Mulai {r.app.coordinatorValidatedAt ? formatDate(r.app.coordinatorValidatedAt) : "—"}
                </span>
                {r.state === "SYNCED" ? (
                  <StatusBadge tone="success">Tersinkron LPPM</StatusBadge>
                ) : r.state === "MISMATCH" ? (
                  <StatusBadge tone="danger">Data berbeda dengan LPPM</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">Siap Sync</StatusBadge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
