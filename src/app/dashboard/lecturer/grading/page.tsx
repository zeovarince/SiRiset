import Link from "next/link";
import { AlertCircle, AlertTriangle, BadgeCheck, CheckCircle2, ClipboardCheck, Lock } from "lucide-react";
import { verifyOutputAction } from "@/app/actions/grading";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GradeConversionTable } from "@/components/grade-conversion-table";
import { OutputList } from "@/components/output-list";
import { StatusBadge, type Tone } from "@/components/status-badge";
import { getGradingRoster, type GradeState } from "@/lib/assessments";
import { requireRole } from "@/lib/auth";
import { RUBRIC, gradeConversion, gradeSummary, type LetterGrade } from "@/lib/grading";
import { TOTAL_WEEKS } from "@/lib/logbook-schedule";
import { cn } from "@/lib/utils";
import { RubricForm } from "./rubric-form";

export const metadata = { title: "Penilaian Rubrik" };

const STATE: Record<GradeState, { label: string; tone: Tone }> = {
  NOT_READY: { label: "Belum siap dinilai", tone: "neutral" },
  READY: { label: "Siap dinilai", tone: "info" },
  DRAFT: { label: "Draf nilai", tone: "warning" },
  PUBLISHED: { label: "Nilai terbit", tone: "success" },
  LOCKED: { label: "Terkunci koordinator", tone: "success" },
};

/** Layar 6 — Formulir Penilaian Rubrik Digital Multi-Kriteria + verifikasi luaran (FR-08.2, FR-09). */
export default async function GradingPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; saved?: string; verified?: string; error?: string }>;
}) {
  const user = await requireRole("DOSEN_PENELITI");
  const sp = await searchParams;
  const roster = await getGradingRoster(user.id);

  if (roster.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <ClipboardCheck className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">Belum ada mahasiswa bimbingan aktif</p>
      </div>
    );
  }

  const selected =
    roster.find((r) => r.app.id === sp.student) ??
    roster.find((r) => r.state === "READY" || r.state === "DRAFT") ??
    roster[0];
  const { app } = selected;
  const a = app.assessment;
  const active = app.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Penilaian Digital MBKM Riset (Kode MK: MB04)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Rubrik resmi Program Studi Teknik Informatika UTM — menggantikan blangko nilai kertas yang dititipkan ke mahasiswa.
        </p>
      </div>

      {sp.saved && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {sp.saved === "published"
            ? "Nilai resmi terbit. Status riset menjadi COMPLETED dan nilai diteruskan ke Koordinator MBKM untuk dikunci & dikonversi."
            : "Draf nilai tersimpan. Anda masih dapat mengubahnya sebelum diterbitkan."}
        </div>
      )}
      {sp.verified && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <BadgeCheck className="mt-0.5 size-4 shrink-0" /> Luaran diverifikasi sesuai target.
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {sp.error}
        </div>
      )}

      <nav aria-label="Mahasiswa bimbingan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roster.map((r) => (
          <Link
            key={r.app.id}
            href={`?student=${r.app.id}`}
            aria-current={r.app.id === app.id ? "true" : undefined}
            className={cn(
              "rounded-xl border bg-white p-4 shadow-sm transition hover:border-navy-300",
              r.app.id === app.id ? "border-navy-600 ring-2 ring-navy-600/20" : "border-slate-200",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-800">{r.app.student.fullName}</p>
                <p className="font-mono text-xs text-slate-500">{r.app.student.nimNip}</p>
              </div>
              {r.app.assessment && r.state !== "DRAFT" && (
                <span className="grid size-9 place-items-center rounded-lg bg-gold-500 font-black text-navy-900">
                  {r.app.assessment.letterGrade}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge tone={STATE[r.state].tone}>{STATE[r.state].label}</StatusBadge>
              <span className="text-slate-500">
                Minggu {Math.min(Math.max(r.week, 0), TOTAL_WEEKS)}/{TOTAL_WEEKS} · {r.verifiedOutputs} luaran ✓
              </span>
            </div>
          </Link>
        ))}
      </nav>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Mahasiswa</dt>
            <dd className="font-semibold text-slate-900">
              {app.student.fullName} <span className="font-mono text-xs text-slate-500">(NIM: {app.student.nimNip})</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Judul Riset</dt>
            <dd className="line-clamp-2 text-slate-800">{app.vacancy.title}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Durasi</dt>
            <dd className="text-slate-800">
              {selected.week > TOTAL_WEEKS ? "4 Bulan Penuh (16 Minggu) — selesai" : `Minggu ke-${Math.max(selected.week, 0)} dari ${TOTAL_WEEKS}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Kepatuhan Logbook</dt>
            <dd className="text-slate-800">
              {selected.compliance.onTime}/{selected.compliance.due} tepat waktu
              {selected.compliance.rate !== null && ` (${selected.compliance.rate.toFixed(1)}%)`} · {selected.validatedLogbooks} divalidasi ·{" "}
              {selected.totalHours} jam
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Hasil Monev LPPM</dt>
            <dd className="text-slate-800">
              {selected.monev
                ? `${selected.monev.average.toFixed(1)} (${selected.monev.category}) · metodologi ${selected.monev.methodology.toFixed(1)}`
                : "Belum dinilai"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Luaran</dt>
            <dd className="text-slate-800">
              {app.outputs.length} didaftarkan · {selected.verifiedOutputs} terverifikasi sesuai target
            </dd>
          </div>
        </dl>

        <div>
          <h3 className="mb-3 font-semibold text-navy-800">Luaran Riset Mahasiswa</h3>
          {app.outputs.length === 0 ? (
            <p className="text-sm text-slate-500">Mahasiswa belum mendaftarkan luaran.</p>
          ) : (
            <OutputList
              outputs={app.outputs}
              actions={(o) =>
                active && !o.isVerifiedByLecturer ? (
                  <form action={verifyOutputAction}>
                    <input type="hidden" name="outputId" value={o.id} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    <ConfirmSubmit className="bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700">
                      <BadgeCheck className="size-3.5" /> Verifikasi Luaran Sesuai Target
                    </ConfirmSubmit>
                  </form>
                ) : null
              }
            />
          )}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 font-semibold text-navy-800">Rubrik Penilaian Resmi Program Studi Teknik Informatika</h3>

          {active ? (
            <>
              {selected.blockers.length > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Nilai resmi belum dapat diterbitkan (draf tetap dapat disimpan):</p>
                    <ul className="list-disc pl-5">
                      {selected.blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <RubricForm
                key={app.id}
                applicationId={app.id}
                studentName={app.student.fullName}
                scheme={app.conversionScheme}
                includesKp={app.includesKpConversion}
                canPublish={selected.blockers.length === 0}
                defaults={Object.fromEntries(RUBRIC.map((r) => [r.key, a ? String(Number(a[r.key])) : ""]))}
                hints={{
                  scoreDisciplineLogbook:
                    selected.compliance.rate !== null
                      ? `Acuan: kepatuhan logbook ${selected.compliance.rate.toFixed(1)}% (${selected.compliance.onTime}/${selected.compliance.due} tepat waktu).`
                      : undefined,
                  scoreResearchQuality: selected.monev
                    ? `Acuan: skor metodologi Monev LPPM ${selected.monev.methodology.toFixed(1)}.`
                    : undefined,
                  scoreOutputAchievement: `Acuan: ${selected.verifiedOutputs} luaran terverifikasi sesuai target.`,
                }}
              />
            </>
          ) : a ? (
            <PublishedResult
              assessment={a}
              scheme={app.conversionScheme}
              includesKp={app.includesKpConversion}
              locked={a.isLockedByCoordinator}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PublishedResult({
  assessment,
  scheme,
  includesKp,
  locked,
}: {
  assessment: NonNullable<Awaited<ReturnType<typeof getGradingRoster>>[number]["app"]["assessment"]>;
  scheme: string;
  includesKp: boolean;
  locked: boolean;
}) {
  const s = gradeSummary(Number(assessment.finalNumericScore));
  const conversion = gradeConversion(scheme, includesKp, assessment.letterGrade as LetterGrade);
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        <Lock className="size-4" /> Nilai resmi telah diterbitkan{locked ? " dan dikunci Koordinator MBKM" : ""}.
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        {RUBRIC.map((r) => (
          <div key={r.key} className="rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">
              {r.no}. {r.label} ({r.weight * 100}%)
            </p>
            <p className="text-lg font-bold text-navy-800 tabular-nums">{Number(assessment[r.key]).toFixed(1)}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-700">
        Total: <strong className="tabular-nums">{s.score.toFixed(2)}</strong> · Huruf mutu <strong>{s.letter}</strong> ({s.description}) ·{" "}
        <span className={s.passing ? "text-green-700" : "text-red-700"}>{conversion.target}</span>
      </p>
      <GradeConversionTable conversion={conversion} />
    </div>
  );
}
