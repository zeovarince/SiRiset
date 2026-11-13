import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  History,
  RefreshCcw,
} from "lucide-react";
import { syncSimpelmasAction } from "@/app/actions/coordinator";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { getSyncOverview, listSyncBatches, type SyncState } from "@/lib/coordinator";
import { academicPeriod, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sinkronisasi SIMPELMAS" };

const STATE_BADGE: Record<SyncState, { label: string; tone: "success" | "warning" | "danger" }> = {
  SYNCED: { label: "Tersinkron", tone: "success" },
  PENDING: { label: "Siap Sync", tone: "warning" },
  MISMATCH: { label: "Data Mismatch", tone: "danger" },
  ERROR: { label: "Gagal Sync", tone: "danger" },
};

/** Pusat Integrasi & 1-Click Sync SIMPELMAS LPPM (FR-05, Layar 5). */
export default async function SyncSimpelmasPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string; failed?: string; batch?: string; error?: string }>;
}) {
  await requireRole("KOORDINATOR_MBKM");
  const sp = await searchParams;
  const [o, batches] = await Promise.all([getSyncOverview(), listSyncBatches()]);
  const outstanding = o.pendingCount + o.mismatchCount;
  const period = academicPeriod();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-800">Pusat Integrasi & Sinkronisasi SIMPELMAS LPPM</h2>
          <p className="mt-1 text-sm text-slate-500">
            Data peserta tervalidasi prodi dikirim langsung ke SIMPELMAS — Dosen Peneliti tidak perlu mendaftarkan ulang
            anggota riset pasca-KRS. Periode {period.label}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/dashboard/coordinator/sk-dekan"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-50"
          >
            <FileText className="size-4" /> Ekspor Rekap untuk SK Dekan Fakultas Teknik
          </Link>
        </div>
      </div>

      {sp.synced !== undefined && !sp.error && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
            Number(sp.failed) > 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-800",
          )}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sp.batch ? (
            <span>
              Sinkronisasi berhasil: <strong>{sp.synced}</strong> data mahasiswa riset dicatat di SIMPELMAS
              {Number(sp.failed) > 0 && <>, {sp.failed} gagal</>}. ID referensi batch:{" "}
              <code className="font-mono font-semibold">{sp.batch}</code>
            </span>
          ) : (
            <span>Tidak ada perubahan — seluruh data peserta sudah sinkron dengan SIMPELMAS.</span>
          )}
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sp.error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Indikator sinkronisasi">
        <div className="grid items-center gap-4 p-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl bg-navy-50 p-5 text-center">
            <Building2 className="mx-auto size-6 text-navy-600" aria-hidden />
            <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Terverifikasi Prodi TI</p>
            <p className="text-4xl font-bold text-navy-800 tabular-nums">{o.verifiedCount}</p>
            <p className="text-xs text-slate-500">mahasiswa</p>
          </div>
          <ArrowLeftRight
            className={cn("mx-auto size-8", outstanding ? "text-amber-500" : "text-green-500")}
            aria-hidden
          />
          <div className="rounded-xl bg-green-50 p-5 text-center">
            <Database className="mx-auto size-6 text-green-700" aria-hidden />
            <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Tercatat di SIMPELMAS LPPM</p>
            <p className="text-4xl font-bold text-green-800 tabular-nums">{o.recordedCount}</p>
            <p className="text-xs text-slate-500">mahasiswa</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 px-6 py-5">
          {o.verifiedCount === 0 ? (
            <StatusBadge tone="neutral">Belum ada peserta tervalidasi prodi</StatusBadge>
          ) : outstanding > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Perhatian: Terdapat data peserta yang belum disinkronkan ke LPPM</p>
                <p className="text-xs">
                  {o.pendingCount > 0 && `${o.pendingCount} peserta belum tercatat di SIMPELMAS`}
                  {o.pendingCount > 0 && o.mismatchCount > 0 && " · "}
                  {o.mismatchCount > 0 && `${o.mismatchCount} data berubah sejak sinkron terakhir (mismatch)`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Status Data: {o.syncPercent}% Sinkron Sempurna ({o.mismatchCount} Data Mismatch)
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {o.lastBatch ? (
                <>
                  Terakhir sinkron: <strong className="text-slate-700">{formatDateTime(o.lastBatch.syncedAt)}</strong> (Oleh:{" "}
                  {o.lastBatch.user.fullName}) · <span className="font-mono">{o.lastBatch.batchReferenceId}</span>
                </>
              ) : (
                "Belum pernah disinkronkan ke SIMPELMAS."
              )}
            </p>
            <form action={syncSimpelmasAction}>
              <ConfirmSubmit
                disabled={outstanding === 0}
                className="bg-gold-500 px-6 py-3 text-base text-navy-900 hover:bg-gold-400"
              >
                <RefreshCcw className="size-5" />
                {outstanding === 0 ? "Semua Data Sudah Sinkron" : "1-Click Sinkronkan ke SIMPELMAS LPPM"}
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-navy-800">Payload Data Peserta (NIM, Nama, NIP Dosen Ketua, Judul Riset, Nomor Hibah)</h3>
          <a
            href="/api/coordinator/sk-dekan-export"
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-navy-900"
          >
            <FileSpreadsheet className="size-4" /> Unduh CSV
          </a>
        </div>
        {o.rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Belum ada peserta tervalidasi.{" "}
            <Link href="/dashboard/coordinator/verification" className="font-medium text-navy-700 hover:underline">
              Validasi berkas prodi →
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">NIM / Nama</th>
                  <th className="px-3 py-3">Dosen Ketua (NIP)</th>
                  <th className="px-3 py-3">Judul Riset / Nomor Hibah</th>
                  <th className="px-3 py-3">Mulai</th>
                  <th className="px-5 py-3">Status SIMPELMAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {o.rows.map((r) => (
                  <tr key={r.app.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-slate-500">{r.participant.nim}</p>
                      <p className="font-medium text-slate-900">{r.participant.studentName}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-slate-800">{r.participant.leadLecturerName}</p>
                      <p className="font-mono text-xs text-slate-500">{r.participant.leadLecturerNip}</p>
                    </td>
                    <td className="max-w-sm px-3 py-3">
                      <p className="line-clamp-2 text-slate-800">{r.participant.researchTitle}</p>
                      <p className="font-mono text-xs text-slate-500">{r.participant.grantContractNumber}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(new Date(r.participant.startDate))}</td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={STATE_BADGE[r.state].tone}>{STATE_BADGE[r.state].label}</StatusBadge>
                      {r.simpelmasId && <p className="mt-1 font-mono text-xs text-slate-600">{r.simpelmasId}</p>}
                      {r.lastSyncedAt && <p className="text-[11px] text-slate-400">{formatDateTime(r.lastSyncedAt)}</p>}
                      {r.lastError && <p className="mt-1 max-w-48 text-xs text-red-600">{r.lastError}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">
          <History className="size-4" /> Log Transaksi Sinkronisasi (simpelmas_sync_logs)
        </h3>
        {batches.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada transaksi sinkronisasi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">ID Referensi Batch</th>
                  <th className="px-3 py-3">Stempel Waktu</th>
                  <th className="px-3 py-3">Oleh</th>
                  <th className="px-3 py-3">Hasil</th>
                  <th className="px-5 py-3">Peserta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-navy-800">{b.id}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDateTime(b.syncedAt)}</td>
                    <td className="px-3 py-3 text-slate-600">{b.by}</td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={b.failed ? "warning" : "success"}>
                        {b.success} sukses{b.failed ? ` · ${b.failed} gagal` : ""}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{b.students.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
