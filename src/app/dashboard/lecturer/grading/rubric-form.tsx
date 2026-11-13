"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Lock, Save } from "lucide-react";
import { saveAssessmentAction } from "@/app/actions/grading";
import { RUBRIC, finalScore, gradeSummary, isPassing, type RubricKey, type RubricScores } from "@/lib/grading";
import type { AssessmentFormState } from "@/lib/grading-schema";
import { cn } from "@/lib/utils";

function IntentButton({
  intent,
  disabled,
  confirmMessage,
  children,
}: {
  intent: "draft" | "publish";
  disabled?: boolean;
  confirmMessage?: string;
  children: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("intent") === intent;
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
        intent === "publish" ? "bg-navy-800 text-white hover:bg-navy-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {mine ? <Loader2 className="size-4 animate-spin" /> : intent === "publish" ? <Lock className="size-4" /> : <Save className="size-4" />}
      {children}
    </button>
  );
}

/** Formulir Penilaian Rubrik Digital — Layar 6 (FR-09.1, FR-09.2). Kalkulasi langsung di layar. */
export function RubricForm({
  applicationId,
  studentName,
  defaults,
  hints,
  canPublish,
  scheme,
  includesKp,
}: {
  applicationId: string;
  studentName: string;
  defaults: Partial<Record<RubricKey, string>>;
  hints: Partial<Record<RubricKey, string>>;
  canPublish: boolean;
  scheme: string;
  includesKp: boolean;
}) {
  const [state, action] = useActionState<AssessmentFormState, FormData>(saveAssessmentAction.bind(null, applicationId), {
    nonce: 0,
  });
  const [values, setValues] = useState<Record<RubricKey, string>>(
    Object.fromEntries(RUBRIC.map((r) => [r.key, defaults[r.key] ?? ""])) as Record<RubricKey, string>,
  );
  const complete = RUBRIC.every((r) => values[r.key] !== "" && !Number.isNaN(Number(values[r.key])));
  const scores = Object.fromEntries(RUBRIC.map((r) => [r.key, Number(values[r.key] || 0)])) as RubricScores;
  const total = finalScore(scores);
  const summary = gradeSummary(total);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}

      <ol className="space-y-3">
        {RUBRIC.map((r) => {
          const v = values[r.key];
          const contribution = v === "" ? null : Number(v) * r.weight;
          return (
            <li key={r.key} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label htmlFor={r.key} className="font-medium text-slate-800">
                    {r.no}. {r.label} <span className="text-sm font-normal text-slate-500">(Bobot: {r.weight * 100}%)</span>
                  </label>
                  {hints[r.key] && <p className="text-xs text-slate-500">{hints[r.key]}</p>}
                  {fe[r.key] && <p className="text-xs text-red-600">{fe[r.key]}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id={r.key}
                    name={r.key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    inputMode="decimal"
                    value={v}
                    onChange={(e) => setValues((s) => ({ ...s, [r.key]: e.target.value }))}
                    placeholder="0–100"
                    className={cn(
                      "w-24 rounded-lg border px-3 py-2 text-right text-sm font-semibold tabular-nums shadow-sm focus:ring-2 focus:outline-none",
                      fe[r.key] ? "border-red-400" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500/20",
                    )}
                  />
                  <span className="w-28 text-right text-xs text-slate-500">
                    Kontribusi: <strong className="text-navy-800 tabular-nums">{contribution === null ? "—" : contribution.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border-2 border-navy-800 bg-navy-50 p-4" aria-live="polite">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Hasil Kalkulasi Otomatis</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Total Nilai Angka</p>
            <p className="text-2xl font-bold text-navy-800 tabular-nums">{complete ? total.toFixed(2) : "—"} <span className="text-sm font-normal text-slate-500">/ 100.00</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Huruf Mutu</p>
            <p className="text-2xl font-bold text-navy-800">
              {complete ? summary.letter : "—"}{" "}
              {complete && <span className="text-sm font-medium text-slate-600">({summary.description} — {summary.passing ? "Lulus" : "Tidak Lulus"})</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Konversi Akademik</p>
            <p className={cn("text-sm font-semibold", complete && !isPassing(summary.letter) ? "text-red-700" : "text-green-700")}>
              {complete
                ? isPassing(summary.letter)
                  ? `Paket ${scheme} (${includesKp ? "20 SKS + KP 2 SKS" : "20 SKS"}) Diakui Penuh`
                  : `Paket ${scheme} tidak diakui`
                : "—"}
            </p>
          </div>
        </div>
        <p className="mt-2 font-mono text-[11px] text-slate-500">Nilai Akhir = 0.20·S1 + 0.30·S2 + 0.30·S3 + 0.20·S4</p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <IntentButton intent="draft">Simpan Draf Nilai</IntentButton>
        <IntentButton
          intent="publish"
          disabled={!canPublish || !complete}
          confirmMessage={`Kunci & terbitkan nilai resmi ${studentName}: ${total.toFixed(2)} (${summary.letter})? Status riset menjadi COMPLETED dan nilai tidak dapat diubah lagi.`}
        >
          Kunci & Terbitkan Nilai Resmi
        </IntentButton>
      </div>
    </form>
  );
}
