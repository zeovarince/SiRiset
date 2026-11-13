"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, FileUp, Loader2, Send } from "lucide-react";
import { submitProgressReportAction } from "@/app/actions/monev";
import type { ProgressReportField, ProgressReportFormState } from "@/lib/monev-schema";
import { cn } from "@/lib/utils";

const inputCls = (invalid?: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:ring-2 focus:outline-none",
    invalid ? "border-red-400 focus:ring-red-500/20" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500/20",
  );

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      {label}
    </button>
  );
}

/** Formulir unggah Laporan Kemajuan (FR-07.1) — menggantikan pengumpulan via Google Classroom. */
export function ReportForm({
  applicationId,
  defaults,
  hasFile,
}: {
  applicationId: string;
  defaults: { reportTitle: string; researchProgressSummary: string; estimatedPercentage: string };
  hasFile: boolean;
}) {
  const [state, action] = useActionState<ProgressReportFormState, FormData>(
    submitProgressReportAction.bind(null, applicationId),
    { nonce: 0 },
  );
  const v = state.values ?? defaults;
  const fe: Partial<Record<ProgressReportField, string>> = state.fieldErrors ?? {};
  const [pct, setPct] = useState(v.estimatedPercentage || "50");
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form key={state.nonce} action={action} noValidate className="space-y-4">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}

      <div>
        <label htmlFor="reportTitle" className="mb-1.5 block text-sm font-medium text-slate-700">
          Judul Laporan Kemajuan
        </label>
        <input
          id="reportTitle"
          name="reportTitle"
          defaultValue={v.reportTitle}
          maxLength={255}
          placeholder="contoh: Laporan Kemajuan: Implementasi Arsitektur ViT untuk Klasifikasi Citra Medis"
          className={inputCls(Boolean(fe.reportTitle))}
        />
        {fe.reportTitle && <p className="mt-1 text-xs text-red-600">{fe.reportTitle}</p>}
      </div>

      <div>
        <label htmlFor="researchProgressSummary" className="mb-1.5 block text-sm font-medium text-slate-700">
          Ringkasan Eksekutif Kemajuan Proyek Riset
        </label>
        <textarea
          id="researchProgressSummary"
          name="researchProgressSummary"
          rows={5}
          maxLength={3000}
          defaultValue={v.researchProgressSummary}
          placeholder="Capaian utama hingga minggu ke-8, hasil eksperimen sementara, kendala, dan rencana paruh kedua riset."
          className={inputCls(Boolean(fe.researchProgressSummary))}
        />
        {fe.researchProgressSummary && <p className="mt-1 text-xs text-red-600">{fe.researchProgressSummary}</p>}
      </div>

      <div>
        <label htmlFor="estimatedPercentage" className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
          Estimasi Persentase Capaian Riset
          <span className="rounded-md bg-navy-50 px-2 py-0.5 text-sm font-bold text-navy-800 tabular-nums">{pct}%</span>
        </label>
        <input
          id="estimatedPercentage"
          name="estimatedPercentage"
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="w-full accent-navy-700"
        />
        {fe.estimatedPercentage && <p className="mt-1 text-xs text-red-600">{fe.estimatedPercentage}</p>}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Berkas Laporan Kemajuan (PDF, templat baku LPPM UTM, maks 5 MB)</p>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-sm hover:border-navy-400 hover:bg-navy-50/50",
            fe.reportFile ? "border-red-300" : "border-slate-300",
          )}
        >
          <FileUp className="size-5 shrink-0 text-slate-400" />
          <span className="truncate text-slate-600">
            {fileName ?? (hasFile ? "Laporan tersimpan — pilih berkas untuk mengganti" : "Pilih berkas laporan (.pdf)")}
          </span>
          <input
            type="file"
            name="reportFile"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {fe.reportFile && <p className="mt-1 text-xs text-red-600">{fe.reportFile}</p>}
        <p className="mt-1 text-xs text-slate-500">
          Sistematika templat LPPM: Pendahuluan · Metodologi · Hasil Sementara · Kendala & Solusi · Rencana Tahap Berikutnya.
        </p>
      </div>

      <div className="flex justify-end">
        <Submit label={hasFile ? "Perbarui Laporan Kemajuan" : "Unggah Laporan Kemajuan"} />
      </div>
    </form>
  );
}
