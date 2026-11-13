import { AlertTriangle, ClipboardCheck, Lightbulb } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { MAJOR_REVISION_THRESHOLD, monevGrade, type EvaluationWithReviewer } from "@/lib/monev";
import { cn } from "@/lib/utils";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-base font-bold text-navy-800 tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div
          className={cn("h-full rounded-full", value >= 70 ? "bg-green-500" : value >= 55 ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/** Hasil penilaian sesi monev LPPM — tampil di dasbor mahasiswa, dosen peneliti, dan reviewer (FR-07.3). */
export function MonevResult({ evaluation, compact = false }: { evaluation: EvaluationWithReviewer; compact?: boolean }) {
  const g = monevGrade(evaluation);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-navy-800 px-4 py-2 text-center text-white">
          <p className="text-[10px] tracking-wide text-navy-200 uppercase">Nilai Monev</p>
          <p className="text-2xl font-bold text-gold-400 tabular-nums">{g.average.toFixed(1)}</p>
        </div>
        <div>
          <StatusBadge tone={g.tone}>{g.category}</StatusBadge>
          <p className="mt-1 text-xs text-slate-500">
            {evaluation.reviewer.fullName} · {formatDateTime(evaluation.evaluatedAt)}
          </p>
        </div>
      </div>

      {g.majorRevision && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Revisi Mayor:</strong> skor capaian di bawah {MAJOR_REVISION_THRESHOLD}. Dosen Peneliti dan mahasiswa perlu
            menyusun rencana aksi pemulihan dalam 14 hari (bpmn-tobe §8 kasus 4).
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreBar label="Skor Capaian Kemajuan Riset" value={g.progress} />
        <ScoreBar label="Skor Penguasaan Metodologi Ilmiah" value={g.methodology} />
      </div>

      <div className={cn("grid gap-3", !compact && "md:grid-cols-2")}>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <ClipboardCheck className="size-3.5" /> Catatan Evaluasi Reviewer
          </p>
          <p className="text-sm whitespace-pre-line text-slate-800">{evaluation.evaluationNotes}</p>
        </div>
        {evaluation.improvementRecommendations && (
          <div className="rounded-lg border border-gold-300 bg-gold-50 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gold-700 uppercase">
              <Lightbulb className="size-3.5" /> Rekomendasi Tindak Lanjut
            </p>
            <p className="text-sm whitespace-pre-line text-slate-800">{evaluation.improvementRecommendations}</p>
          </div>
        )}
      </div>
    </div>
  );
}
