"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { resubmitRevisionAction, type RevisionState } from "@/app/actions/approvals";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      Kirim Ulang ke 3 Approver
    </button>
  );
}

/** Formulir perbaikan berkas setelah salah satu approver meminta revisi. */
export function RevisionForm({
  applicationId,
  proposalTitle,
  includesKp,
}: {
  applicationId: string;
  proposalTitle: string;
  includesKp: boolean;
}) {
  const [state, action] = useActionState<RevisionState, FormData>(resubmitRevisionAction.bind(null, applicationId), {
    nonce: 0,
  });

  return (
    <form action={action} className="space-y-3 rounded-lg border border-orange-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">Perbaiki & Kirim Ulang Berkas</p>
      {state.error && (
        <p role="alert" className="flex items-start gap-1.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {state.error}
        </p>
      )}
      <div>
        <label htmlFor={`rev-title-${applicationId}`} className="mb-1 block text-xs font-medium text-slate-600">
          Judul Rencana Riset
        </label>
        <input
          id={`rev-title-${applicationId}`}
          name="proposalTitle"
          defaultValue={proposalTitle}
          maxLength={255}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="includesKpConversion"
          defaultChecked={includesKp}
          className="size-4 rounded border-slate-300 accent-navy-700"
        />
        Sertakan Konversi Kerja Praktik (KP 2 SKS, topik terpisah)
      </label>
      <div>
        <label htmlFor={`rev-file-${applicationId}`} className="mb-1 block text-xs font-medium text-slate-600">
          Proposal revisi (.PDF, maks 5 MB) — opsional, kosongkan bila tidak berubah
        </label>
        <input
          id={`rev-file-${applicationId}`}
          type="file"
          name="proposal"
          accept="application/pdf,.pdf"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-navy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100"
        />
      </div>
      <p className="text-xs text-slate-500">
        Setelah dikirim ulang, ketiga persetujuan diulang dari awal agar stempel digital melekat pada versi dokumen terbaru.
      </p>
      <SubmitButton />
    </form>
  );
}
