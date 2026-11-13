"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Paperclip, Plus } from "lucide-react";
import { createOutputAction } from "@/app/actions/grading";
import { OUTPUT_TYPES, PUBLICATION_STATUSES, type OutputField, type OutputFormState } from "@/lib/grading-schema";
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
      className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Daftarkan Luaran
    </button>
  );
}

/** Formulir pendaftaran luaran riset sesuai target proposal (FR-08.1, Solusi PP9). */
export function OutputForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState<OutputFormState, FormData>(createOutputAction.bind(null, applicationId), { nonce: 0 });
  const v = state.values;
  const fe: Partial<Record<OutputField, string>> = state.fieldErrors ?? {};
  const [type, setType] = useState(v?.outputType || "JURNAL");
  const [fileName, setFileName] = useState<string | null>(null);
  const err = (k: OutputField) => fe[k] && <p className="mt-1 text-xs text-red-600">{fe[k]}</p>;

  return (
    <form key={state.nonce} action={action} noValidate className="space-y-4">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Kategori Luaran</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(OUTPUT_TYPES).map(([key, label]) => (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition",
                type === key ? "border-navy-600 bg-navy-50 text-navy-800 ring-1 ring-navy-600" : "border-slate-300 text-slate-600 hover:bg-slate-50",
              )}
            >
              <input type="radio" name="outputType" value={key} checked={type === key} onChange={() => setType(key)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        {err("outputType")}
      </fieldset>

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
          Judul Naskah / Luaran Publikasi
        </label>
        <input
          id="title"
          name="title"
          defaultValue={v?.title}
          maxLength={255}
          placeholder="contoh: Brain Tumor Classification Using Enhanced Vision Transformer Architecture"
          className={inputCls(Boolean(fe.title))}
        />
        {err("title")}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <label htmlFor="targetPublicationName" className="mb-1.5 block text-sm font-medium text-slate-700">
            Target Publikasi
          </label>
          <input
            id="targetPublicationName"
            name="targetPublicationName"
            defaultValue={v?.targetPublicationName}
            maxLength={255}
            placeholder="contoh: Jurnal Sinta 2 / Konferensi Nasional"
            className={inputCls(Boolean(fe.targetPublicationName))}
          />
          {err("targetPublicationName")}
        </div>
        <div>
          <label htmlFor="publicationStatus" className="mb-1.5 block text-sm font-medium text-slate-700">
            Status Publikasi
          </label>
          <select id="publicationStatus" name="publicationStatus" defaultValue={v?.publicationStatus || "DRAFT"} className={inputCls(Boolean(fe.publicationStatus))}>
            {Object.entries(PUBLICATION_STATUSES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Unggah Draf Naskah / Poster</p>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-sm hover:border-navy-400 hover:bg-navy-50/50",
              fe.document ? "border-red-300" : "border-slate-300",
            )}
          >
            <Paperclip className="size-4 shrink-0 text-slate-400" />
            <span className="truncate text-slate-600">{fileName ?? "PDF (≤ 5 MB) atau PNG/JPG (≤ 2 MB)"}</span>
            <input
              type="file"
              name="document"
              accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          {err("document")}
        </div>
        <div>
          <label htmlFor="demoLink" className="mb-1.5 block text-sm font-medium text-slate-700">
            {type === "PROTOTIPE" ? "Tautan Demo Aplikasi / Repositori" : "atau Tautan (DOI / repositori)"}
          </label>
          <input
            id="demoLink"
            name="demoLink"
            type="url"
            defaultValue={v?.demoLink}
            placeholder="https://…"
            className={inputCls(Boolean(fe.demoLink))}
          />
          {err("demoLink")}
        </div>
      </div>
      <p className="text-xs text-slate-500">Wajib salah satu: berkas unggahan atau tautan https.</p>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
