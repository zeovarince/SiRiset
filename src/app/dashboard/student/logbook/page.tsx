import Link from "next/link";
import { BellRing, CheckCircle2, Clock, Lock, NotebookPen, RotateCcw } from "lucide-react";
import { LogbookEntry } from "@/components/logbook-entry";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDate, todayWIB, toDateInputValue } from "@/lib/format";
import { TOTAL_WEEKS, isGraceSubmission, isLateSubmission } from "@/lib/logbook-schedule";
import { WEEK_STATE, getStudentResearch, weekState, type WeekStateKey } from "@/lib/logbooks";
import { cn } from "@/lib/utils";
import { LogbookForm } from "./logbook-form";

export const metadata = { title: "Logbook Mingguan" };

const CHIP: Record<WeekStateKey, string> = {
  VALIDATED: "border-green-300 bg-green-50 text-green-800",
  SUBMITTED: "border-navy-200 bg-navy-50 text-navy-800",
  REVISION_NEEDED: "border-orange-300 bg-orange-50 text-orange-800",
  MISSING: "border-red-300 bg-red-50 text-red-700",
  OPEN: "border-slate-300 bg-white text-slate-700",
  LOCKED: "border-slate-200 bg-slate-50 text-slate-400",
};

const SAVED: Record<string, string> = {
  created: "Logbook terkirim tepat waktu dan masuk ke dasbor Dosen Peneliti untuk diulas.",
  late: "Logbook terkirim, namun ditandai TERLAMBAT karena melewati Minggu 23:59 WIB.",
  updated: "Perbaikan logbook terkirim dan kembali menunggu ulasan dosen.",
};

/** Digital Weekly Logbook — linimasa 16 minggu + formulir isian (FR-06.1). */
export default async function StudentLogbookPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; saved?: string }>;
}) {
  const user = await requireRole("MAHASISWA");
  const sp = await searchParams;
  const research = await getStudentResearch(user.id);

  if (!research) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <NotebookPen className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">Logbook belum aktif</p>
        <p className="mt-1 text-sm text-slate-500">
          Logbook mingguan terbuka setelah pendaftaran Anda divalidasi Koordinator MBKM (status Riset Aktif).
        </p>
        <Link href="/dashboard/student/tracker" className="mt-4 inline-block text-sm font-medium text-navy-600 hover:text-navy-800">
          Lihat status pendaftaran →
        </Link>
      </div>
    );
  }

  const { app, weeks, current, compliance } = research;
  const byWeek = new Map(app.logbooks.map((l) => [l.weekNumber, l]));
  const now = new Date();
  const states = weeks.map((w) => weekState(w, byWeek.get(w.week), current, now));

  const firstRevision = app.logbooks.find((l) => l.status === "REVISION_NEEDED")?.weekNumber;
  const requested = Number(sp.week);
  const selected =
    Number.isInteger(requested) && requested >= 1 && requested <= TOTAL_WEEKS
      ? requested
      : (firstRevision ?? Math.min(Math.max(current, 1), TOTAL_WEEKS));
  const sw = weeks[selected - 1];
  const sEntry = byWeek.get(selected);
  const sState = states[selected - 1];
  const editable = app.status === "IN_PROGRESS" && (sState === "OPEN" || sState === "MISSING" || sState === "SUBMITTED" || sState === "REVISION_NEEDED");
  const latestAllowed = sw.sunday < todayWIB() ? sw.sunday : todayWIB();

  const currentWindow = current >= 1 && current <= TOTAL_WEEKS ? weeks[current - 1] : null;
  const currentFilled = currentWindow ? byWeek.has(currentWindow.week) : true;
  const validated = app.logbooks.filter((l) => l.status === "VALIDATED").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Digital Weekly Logbook</h2>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
          {app.vacancy.title} · Pembimbing {app.vacancy.lecturer.fullName}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-navy-900 sm:flex-row sm:items-center">
        <BellRing className="size-5 shrink-0 text-gold-600" aria-hidden />
        <p className="flex-1">
          <strong>Batas Pengisian Logbook: Setiap Jumat Pukul 23:59 WIB.</strong>{" "}
          <span className="text-slate-600">Masa tenggang hingga Minggu 23:59 WIB; setelahnya ditandai TERLAMBAT.</span>
        </p>
        {currentWindow && !currentFilled && (
          <Link
            href={`?week=${currentWindow.week}`}
            className="shrink-0 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700"
          >
            Isi Minggu ke-{currentWindow.week} · tenggat {formatDate(currentWindow.deadline)}
          </Link>
        )}
      </div>

      {sp.saved && SAVED[sp.saved] && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
            sp.saved === "late" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800",
          )}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {SAVED[sp.saved]}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan logbook">
        {[
          { label: "Minggu berjalan", value: current > TOTAL_WEEKS ? "Selesai" : `${Math.max(current, 0)} / ${TOTAL_WEEKS}` },
          { label: "Logbook terisi", value: `${app.logbooks.length} minggu` },
          { label: "Divalidasi dosen", value: `${validated} minggu` },
          {
            label: "Kepatuhan tepat waktu",
            value: compliance.rate === null ? "—" : `${compliance.rate.toFixed(1)}%`,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-navy-800 tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Linimasa 16 minggu" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Linimasa 16 Minggu Pelaksanaan</p>
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {weeks.map((w, i) => {
            const st = states[i];
            const entry = byWeek.get(w.week);
            const isSel = w.week === selected;
            return (
              <li key={w.week}>
                <Link
                  href={`?week=${w.week}`}
                  aria-current={isSel ? "true" : undefined}
                  className={cn(
                    "flex h-full flex-col rounded-lg border px-2 py-1.5 text-left transition hover:shadow-sm",
                    CHIP[st],
                    isSel && "ring-2 ring-navy-600 ring-offset-1",
                    w.week === current && !isSel && "ring-2 ring-gold-400",
                  )}
                >
                  <span className="flex items-center justify-between text-xs font-bold">
                    M-{String(w.week).padStart(2, "0")}
                    {st === "LOCKED" && <Lock className="size-3" aria-hidden />}
                    {st === "REVISION_NEEDED" && <RotateCcw className="size-3" aria-hidden />}
                    {st === "VALIDATED" && <CheckCircle2 className="size-3" aria-hidden />}
                  </span>
                  <span className="text-[10px] opacity-75">{formatDate(new Date(`${w.monday}T12:00:00+07:00`)).slice(0, 6)}</span>
                  <span className="mt-0.5 text-[10px] font-medium">{WEEK_STATE[st].label}</span>
                  {entry?.isLate && <span className="text-[10px] font-bold text-red-600">TERLAMBAT</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-navy-800">Logbook Minggu ke-{selected}</h3>
            <p className="text-xs text-slate-500">
              {formatDate(new Date(`${sw.monday}T12:00:00+07:00`))} – {formatDate(new Date(`${sw.sunday}T12:00:00+07:00`))} ·
              Tenggat Jumat {formatDate(sw.deadline)}, 23:59 WIB
            </p>
          </div>
          <StatusBadge tone={WEEK_STATE[sState].tone}>{WEEK_STATE[sState].label}</StatusBadge>
        </header>

        <div className="space-y-5 px-5 py-5">
          {sState === "LOCKED" && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Lock className="size-4" /> Logbook minggu ini terbuka mulai Senin, {formatDate(new Date(`${sw.monday}T12:00:00+07:00`))}.
            </p>
          )}

          {sEntry && <LogbookEntry logbook={sEntry} window={sw} />}

          {sEntry?.status === "SUBMITTED" && (
            <p className="flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-800">
              <Clock className="size-4" /> Menunggu ulasan Dosen Peneliti. Anda masih dapat memperbarui isian di bawah sebelum
              diulas.
            </p>
          )}

          {editable && (
            <div className={cn(sEntry && "border-t border-slate-100 pt-5")}>
              <p className="mb-3 text-sm font-semibold text-slate-800">
                {sEntry?.status === "REVISION_NEEDED"
                  ? "Perbaiki Logbook Sesuai Catatan Dosen"
                  : sEntry
                    ? "Perbarui Isian Logbook"
                    : "Formulir Input Logbook Mingguan"}
              </p>
              <LogbookForm
                key={`${selected}-${sEntry?.id ?? "new"}`}
                applicationId={app.id}
                week={selected}
                minDate={sw.monday}
                maxDate={latestAllowed}
                hasEvidence={Boolean(sEntry?.evidenceFileUrl)}
                lateWarning={!sEntry && isLateSubmission(sw, now)}
                graceWarning={!sEntry && isGraceSubmission(sw, now)}
                isRevision={sEntry?.status === "REVISION_NEEDED"}
                defaults={{
                  activityDate: sEntry ? toDateInputValue(sEntry.activityDate) : latestAllowed,
                  durationHours: sEntry ? String(sEntry.durationHours) : "",
                  activityDescription: sEntry?.activityDescription ?? "",
                  challengesFaced: sEntry?.challengesFaced ?? "",
                  solutionsImplemented: sEntry?.solutionsImplemented ?? "",
                  repositoryLink: sEntry?.repositoryLink ?? "",
                }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
