"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, FileText, Loader2, Send, Upload, X } from "lucide-react";
import { submitApplicationAction } from "@/app/actions/applications";
import { CONVERSION_SCHEMES, type ApplicationField, type ApplyFormState } from "@/lib/application-schema";
import { cn } from "@/lib/utils";

const MAX_MB = 5;

const inputCls = (invalid?: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-300 focus:border-navy-500 focus:ring-navy-500/20",
  );

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      Submit Pendaftaran Sekarang
    </button>
  );
}

/** Formulir pendaftaran satu pintu — sekali submit, 100% paperless (Solusi PP4). */
export function ApplyForm({ vacancyId, disabled }: { vacancyId: string; disabled: boolean }) {
  const [state, formAction] = useActionState<ApplyFormState, FormData>(
    submitApplicationAction.bind(null, vacancyId),
    { nonce: 0 },
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fe: Partial<Record<ApplicationField, string>> = state.fieldErrors ?? {};
  const v = state.values;
  const proposalError = fileError ?? fe.proposal;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (f && !f.name.toLowerCase().endsWith(".pdf")) setFileError("Berkas harus berformat .PDF.");
    else if (f && f.size > MAX_MB * 1024 * 1024) setFileError(`Ukuran berkas melebihi ${MAX_MB} MB.`);
    setFile(f);
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setFile(null);
    setFileError(null);
  }

  return (
    <form
      key={state.nonce}
      action={formAction}
      noValidate
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h3 className="font-semibold text-navy-800">Kelengkapan Berkas Rencana Riset</h3>
        <p className="text-xs text-slate-500">Single submit — 100% paperless, tanpa map fisik maupun formulir Google Drive terpisah.</p>
      </div>

      {state.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </div>
      )}

      <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
        <div>
          <label htmlFor="proposalTitle" className="mb-1.5 block text-sm font-medium text-slate-700">
            1. Judul Rencana Riset Mahasiswa
          </label>
          <input
            id="proposalTitle"
            name="proposalTitle"
            defaultValue={v?.proposalTitle}
            maxLength={255}
            placeholder="contoh: Penerapan Algoritma ViT pada Citra CT-Scan Tumor Otak"
            aria-invalid={Boolean(fe.proposalTitle) || undefined}
            className={inputCls(Boolean(fe.proposalTitle))}
          />
          {fe.proposalTitle && <p className="mt-1 text-xs text-red-600">{fe.proposalTitle}</p>}
        </div>

        <div>
          <label htmlFor="conversionScheme" className="mb-1.5 block text-sm font-medium text-slate-700">
            2. Paket Konversi Mata Kuliah
          </label>
          <select
            id="conversionScheme"
            name="conversionScheme"
            defaultValue={v?.conversionScheme || "MB04"}
            className={inputCls(Boolean(fe.conversionScheme))}
          >
            {Object.entries(CONVERSION_SCHEMES).map(([code, s]) => (
              <option key={code} value={code}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Mencakup: {CONVERSION_SCHEMES.MB04.courses.map((c) => `${c.name} (${c.credits} SKS)`).join(", ")}.
          </p>
          {fe.conversionScheme && <p className="mt-1 text-xs text-red-600">{fe.conversionScheme}</p>}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="includesKpConversion"
              defaultChecked={v?.includesKpConversion}
              className="mt-0.5 size-4 rounded border-slate-300 accent-navy-700"
            />
            <span>
              <span className="font-medium text-slate-800">3. Konversi Kerja Praktik (KP 2 SKS terpisah)</span>
              <span className="block text-xs text-slate-500">
                BR-02: topik & laporan KP wajib berbeda dari proyek utama riset MBKM (no output duplication policy).
              </span>
            </span>
          </label>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">4. Unggah Proposal Ringkas (.PDF, maks {MAX_MB} MB)</p>
          <input
            ref={fileRef}
            id="proposal"
            name="proposal"
            type="file"
            accept="application/pdf,.pdf"
            onChange={onFileChange}
            className="sr-only"
            aria-invalid={Boolean(proposalError) || undefined}
          />
          {file ? (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                proposalError ? "border-red-300 bg-red-50" : "border-slate-200 bg-white",
              )}
            >
              <FileText className="size-5 shrink-0 text-red-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <X className="size-3.5" /> Hapus
              </button>
            </div>
          ) : (
            <label
              htmlFor="proposal"
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition hover:border-navy-400 hover:bg-navy-50/50",
                proposalError ? "border-red-300 bg-red-50/50" : "border-slate-300",
              )}
            >
              <Upload className="size-6 text-slate-400" aria-hidden />
              <span className="font-medium text-navy-700">Pilih berkas proposal</span>
              <span className="text-xs text-slate-500">PDF, maksimal {MAX_MB} MB</span>
            </label>
          )}
          {proposalError && <p className="mt-1 text-xs text-red-600">{proposalError}</p>}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/student/vacancies" className="text-center text-sm text-slate-500 hover:text-slate-700">
          Batal
        </Link>
        <SubmitButton disabled={disabled || Boolean(fileError)} />
      </div>
    </form>
  );
}
