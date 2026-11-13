import { AlertCircle, Award, CheckCircle2, GraduationCap, Trash2 } from "lucide-react";
import { deleteOutputAction } from "@/app/actions/grading";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GradeConversionTable } from "@/components/grade-conversion-table";
import { OutputList } from "@/components/output-list";
import { StatusBadge } from "@/components/status-badge";
import { getPublishedGrade } from "@/lib/assessments";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { RUBRIC } from "@/lib/grading";
import { getStudentResearch } from "@/lib/logbooks";
import { listOutputs } from "@/lib/outputs";
import { OutputForm } from "./output-form";

export const metadata = { title: "Luaran Riset" };

/** Repositori luaran riset mahasiswa + transkrip nilai konversi MB04 (FR-08, FR-09). */
export default async function StudentOutputsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireRole("MAHASISWA");
  const sp = await searchParams;
  const research = await getStudentResearch(user.id);

  if (!research) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Award className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">Modul luaran belum aktif</p>
        <p className="mt-1 text-sm text-slate-500">Tersedia setelah riset Anda berstatus aktif.</p>
      </div>
    );
  }

  const { app } = research;
  const [outputs, grade] = await Promise.all([listOutputs(app.id), getPublishedGrade(app.id)]);
  const verified = outputs.filter((o) => o.isVerifiedByLecturer).length;
  const active = app.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Luaran Riset & Nilai Akhir</h2>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
          {app.vacancy.title} · Pembimbing {app.vacancy.lecturer.fullName}
        </p>
      </div>

      {sp.saved && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {sp.saved === "created" ? "Luaran terdaftar dan menunggu verifikasi Dosen Peneliti." : "Luaran dihapus."}
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {sp.error}
        </div>
      )}

      {grade && (
        <section className="overflow-hidden rounded-2xl border border-green-300 bg-white shadow-sm">
          <header className="flex flex-col gap-4 bg-navy-800 px-6 py-5 text-white sm:flex-row sm:items-center">
            <GraduationCap className="size-8 text-gold-400" aria-hidden />
            <div className="flex-1">
              <p className="text-xs tracking-wide text-navy-200 uppercase">Nilai Akhir Resmi MBKM Riset (MB04)</p>
              <p className="text-sm text-navy-100">
                Diterbitkan {formatDateTime(grade.assessment.finalizedAt)} oleh {grade.assessment.evaluator.fullName}
                {grade.assessment.isLockedByCoordinator && " · dikunci Koordinator MBKM"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-navy-200">Nilai angka</p>
                <p className="text-2xl font-bold tabular-nums">{grade.summary.score.toFixed(2)}</p>
              </div>
              <div className="grid size-16 place-items-center rounded-xl bg-gold-500 text-3xl font-black text-navy-900">
                {grade.summary.letter}
              </div>
            </div>
          </header>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {RUBRIC.map((r) => (
                <div key={r.key} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">
                    {r.no}. {r.label} ({r.weight * 100}%)
                  </p>
                  <p className="text-lg font-bold text-navy-800 tabular-nums">{Number(grade.assessment[r.key]).toFixed(1)}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-semibold text-green-700">{grade.conversion.target}</p>
            <GradeConversionTable conversion={grade.conversion} />
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-navy-800">Luaran Terdaftar</h3>
          <StatusBadge tone={verified ? "success" : "warning"}>
            {verified}/{outputs.length} terverifikasi
          </StatusBadge>
        </div>
        {outputs.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada luaran. Daftarkan luaran sesuai komitmen proposal agar target riset jelas sejak awal (PP9).
          </p>
        ) : (
          <OutputList
            outputs={outputs}
            actions={(o) =>
              active && !o.isVerifiedByLecturer ? (
                <form action={deleteOutputAction.bind(null, o.id)}>
                  <ConfirmSubmit
                    confirmMessage={`Hapus luaran "${o.title}"?`}
                    className="border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" /> Hapus
                  </ConfirmSubmit>
                </form>
              ) : null
            }
          />
        )}
      </section>

      {active && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-navy-800">Daftarkan Luaran Riset</h3>
          <OutputForm applicationId={app.id} />
        </section>
      )}
    </div>
  );
}
