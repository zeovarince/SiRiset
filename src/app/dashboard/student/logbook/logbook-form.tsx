"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, AlertTriangle, Loader2, Paperclip, Send } from "lucide-react";
import { submitLogbookAction } from "@/app/actions/logbooks";
import type { LogbookField, LogbookFormState, LogbookFormValues } from "@/lib/logbook-schema";
import { cn } from "@/lib/utils";

const inputCls = (invalid?: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:ring-2 focus:outline-none",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-300 focus:border-navy-500 focus:ring-navy-500/20",
  );

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      {label}
    </button>
  );
}

/** Formulir logbook mingguan (FR-06.1). Dipakai untuk pengisian baru maupun perbaikan setelah revisi. */
export function LogbookForm({
  applicationId,
  week,
  minDate,
  maxDate,
  defaults,
  hasEvidence,
  lateWarning,
  graceWarning,
  isRevision,
}: {
  applicationId: string;
  week: number;
  minDate: string;
  maxDate: string;
  defaults: LogbookFormValues;
  hasEvidence: boolean;
  lateWarning: boolean;
  graceWarning: boolean;
  isRevision: boolean;
}) {
  const [state, action] = useActionState<LogbookFormState, FormData>(
    submitLogbookAction.bind(null, applicationId, week),
    { nonce: 0 },
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const v = state.values ?? defaults;
  const fe: Partial<Record<LogbookField, string>> = state.fieldErrors ?? {};
  const err = (k: LogbookField) => fe[k] && <p className="mt-1 text-xs text-red-600">{fe[k]}</p>;

  return (
    <form key={state.nonce} action={action} noValidate className="space-y-4">
      {lateWarning && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Batas pengisian minggu ini (Minggu 23:59 WIB) sudah lewat — logbook akan ditandai <strong>TERLAMBAT</strong> dan
          memengaruhi persentase kepatuhan.
        </p>
      )}
      {graceWarning && !lateWarning && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Batas baku Jumat 23:59 WIB sudah lewat. Anda masih dalam masa tenggang hingga Minggu 23:59 WIB.
        </p>
      )}
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="activityDate" className="mb-1.5 block text-sm font-medium text-slate-700">
            Tanggal Pelaksanaan Riset
          </label>
          <input
            id="activityDate"
            name="activityDate"
            type="date"
            min={minDate}
            max={maxDate}
            defaultValue={v.activityDate}
            className={inputCls(Boolean(fe.activityDate))}
          />
          {err("activityDate")}
        </div>
        <div>
          <label htmlFor="durationHours" className="mb-1.5 block text-sm font-medium text-slate-700">
            Total Durasi Riset Minggu Ini (Jam)
          </label>
          <input
            id="durationHours"
            name="durationHours"
            type="number"
            min={1}
            max={60}
            inputMode="numeric"
            placeholder="contoh: 18"
            defaultValue={v.durationHours}
            className={inputCls(Boolean(fe.durationHours))}
          />
          {err("durationHours")}
        </div>
      </div>

      <div>
        <label htmlFor="activityDescription" className="mb-1.5 block text-sm font-medium text-slate-700">
          Deskripsi Rinci Aktivitas Riset
        </label>
        <textarea
          id="activityDescription"
          name="activityDescription"
          rows={4}
          maxLength={3000}
          defaultValue={v.activityDescription}
          placeholder="contoh: Preprocessing dataset MRI: normalisasi 224×224, augmentasi rotasi & flipping, split 70/15/15."
          className={inputCls(Boolean(fe.activityDescription))}
        />
        {err("activityDescription")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="challengesFaced" className="mb-1.5 block text-sm font-medium text-slate-700">
            Kendala Teknis / Masalah
          </label>
          <textarea
            id="challengesFaced"
            name="challengesFaced"
            rows={3}
            maxLength={2000}
            defaultValue={v.challengesFaced}
            placeholder="contoh: Ketidakseimbangan kelas tumor jinak vs ganas."
            className={inputCls(Boolean(fe.challengesFaced))}
          />
          {err("challengesFaced")}
        </div>
        <div>
          <label htmlFor="solutionsImplemented" className="mb-1.5 block text-sm font-medium text-slate-700">
            Upaya / Solusi yang Diterapkan
          </label>
          <textarea
            id="solutionsImplemented"
            name="solutionsImplemented"
            rows={3}
            maxLength={2000}
            defaultValue={v.solutionsImplemented}
            placeholder="contoh: Oversampling SMOTE dan focal loss."
            className={inputCls(Boolean(fe.solutionsImplemented))}
          />
          {err("solutionsImplemented")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Berkas Bukti (Foto / Screenshot / Dokumen)</p>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-sm hover:border-navy-400 hover:bg-navy-50/50",
              fe.evidence ? "border-red-300" : "border-slate-300",
            )}
          >
            <Paperclip className="size-4 shrink-0 text-slate-400" />
            <span className="truncate text-slate-600">
              {fileName ?? (hasEvidence ? "Bukti tersimpan — pilih berkas untuk mengganti" : "Pilih JPG/PNG (≤ 2 MB) atau PDF (≤ 5 MB)")}
            </span>
            <input
              type="file"
              name="evidence"
              accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          {err("evidence")}
        </div>
        <div>
          <label htmlFor="repositoryLink" className="mb-1.5 block text-sm font-medium text-slate-700">
            Tautan Repositori Kode
          </label>
          <input
            id="repositoryLink"
            name="repositoryLink"
            type="url"
            defaultValue={v.repositoryLink}
            placeholder="https://github.com/…/commit/3c2e1f4 atau tautan Colab"
            className={inputCls(Boolean(fe.repositoryLink))}
          />
          {err("repositoryLink")}
        </div>
      </div>
      <p className="text-xs text-slate-500">Wajib minimal satu bukti: berkas unggahan atau tautan repositori (FR-06.1).</p>

      <div className="flex justify-end">
        <Submit label={isRevision ? "Kirim Perbaikan Logbook" : `Submit Logbook Minggu ke-${week}`} />
      </div>
    </form>
  );
}
