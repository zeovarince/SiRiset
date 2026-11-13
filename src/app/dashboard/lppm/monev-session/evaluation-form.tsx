"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, AlertTriangle, Loader2, Save } from "lucide-react";
import { evaluateReportAction } from "@/app/actions/monev";
import type { MonevEvaluationField, MonevEvaluationFormState } from "@/lib/monev-schema";
import { cn } from "@/lib/utils";

const inputCls = (invalid?: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:ring-2 focus:outline-none",
    invalid ? "border-red-400 focus:ring-red-500/20" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500/20",
  );

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      Simpan Penilaian Sesi Monev
    </button>
  );
}

function ScoreInput({
  name,
  label,
  value,
  onChange,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} <span className="font-normal text-slate-400">(0–100)</span>
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={value || "0"}
          onChange={(e) => onChange(e.target.value)}
          aria-hidden
          tabIndex={-1}
          className="flex-1 accent-navy-700"
        />
        <input
          id={name}
          name={name}
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls(Boolean(error)), "w-24 text-right font-semibold tabular-nums")}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Formulir Penilaian Sesi Monev (FR-07.3, api-spec §8.2). */
export function EvaluationForm({ reportId }: { reportId: string }) {
  const [state, action] = useActionState<MonevEvaluationFormState, FormData>(evaluateReportAction.bind(null, reportId), {
    nonce: 0,
  });
  const fe: Partial<Record<MonevEvaluationField, string>> = state.fieldErrors ?? {};
  const [progress, setProgress] = useState(state.values?.scoreProgress ?? "");
  const [methodology, setMethodology] = useState(state.values?.scoreMethodology ?? "");
  const avg = progress !== "" && methodology !== "" ? (Number(progress) + Number(methodology)) / 2 : null;

  return (
    <form key={state.nonce} action={action} noValidate className="space-y-4 rounded-xl border border-gold-300 bg-gold-50/40 p-4">
      <p className="font-semibold text-navy-800">Formulir Penilaian Sesi Monev</p>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}

      <ScoreInput name="scoreProgress" label="Skor Capaian Kemajuan Riset" value={progress} onChange={setProgress} error={fe.scoreProgress} />
      <ScoreInput
        name="scoreMethodology"
        label="Skor Penguasaan Metodologi Ilmiah"
        value={methodology}
        onChange={setMethodology}
        error={fe.scoreMethodology}
      />

      {avg !== null && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
          Nilai monev (rata-rata): <strong className="text-navy-800 tabular-nums">{avg.toFixed(1)}</strong>
        </p>
      )}
      {progress !== "" && Number(progress) < 40 && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Skor capaian &lt; 40 akan menandai riset ini sebagai <strong>Revisi Mayor</strong> (wajib rencana aksi pemulihan 14 hari).
        </p>
      )}

      <div>
        <label htmlFor="evaluationNotes" className="mb-1.5 block text-sm font-medium text-slate-700">
          Catatan Evaluasi Reviewer
        </label>
        <textarea
          id="evaluationNotes"
          name="evaluationNotes"
          rows={4}
          maxLength={3000}
          defaultValue={state.values?.evaluationNotes}
          placeholder="contoh: Progres riset sangat baik dan sesuai timeline hibah dosen."
          className={inputCls(Boolean(fe.evaluationNotes))}
        />
        {fe.evaluationNotes && <p className="mt-1 text-xs text-red-600">{fe.evaluationNotes}</p>}
      </div>
      <div>
        <label htmlFor="improvementRecommendations" className="mb-1.5 block text-sm font-medium text-slate-700">
          Rekomendasi Tindak Lanjut Perbaikan
        </label>
        <textarea
          id="improvementRecommendations"
          name="improvementRecommendations"
          rows={3}
          maxLength={3000}
          defaultValue={state.values?.improvementRecommendations}
          placeholder="contoh: Tambahkan visualisasi Attention Map untuk analisis interpretasi model."
          className={inputCls(Boolean(fe.improvementRecommendations))}
        />
        {fe.improvementRecommendations && <p className="mt-1 text-xs text-red-600">{fe.improvementRecommendations}</p>}
      </div>
      <Submit />
      <p className="text-xs text-slate-500">Nilai & rekomendasi langsung tampil di dasbor Dosen Peneliti dan Mahasiswa.</p>
    </form>
  );
}
