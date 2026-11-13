"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { reviewLogbookAction } from "@/app/actions/logbooks";
import { cn } from "@/lib/utils";

function ActionButton({ value, children }: { value: "APPROVED" | "REVISION_REQUESTED"; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("reviewStatus") === value;
  return (
    <button
      type="submit"
      name="reviewStatus"
      value={value}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60",
        value === "APPROVED"
          ? "bg-green-600 text-white hover:bg-green-700"
          : "border border-orange-300 bg-white text-orange-700 hover:bg-orange-50",
      )}
    >
      {mine ? <Loader2 className="size-4 animate-spin" /> : value === "APPROVED" ? <CheckCircle2 className="size-4" /> : <RotateCcw className="size-4" />}
      {children}
    </button>
  );
}

/** Inline mentoring: catatan arahan bimbingan + Validasi / Minta Revisi (FR-06.2). */
export function ReviewForm({ logbookId, applicationId, week }: { logbookId: string; applicationId: string; week: number }) {
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const notes = String(new FormData(e.currentTarget).get("feedbackNotes") ?? "").trim();
    if (submitter?.value === "REVISION_REQUESTED" && notes.length < 10) {
      e.preventDefault();
      setError("Tuliskan arahan revisi minimal 10 karakter agar mahasiswa tahu apa yang harus diperbaiki.");
    }
  }

  return (
    <form action={reviewLogbookAction} onSubmit={onSubmit} className="space-y-3 rounded-xl border border-gold-300 bg-gold-50/50 p-4">
      <input type="hidden" name="logbookId" value={logbookId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="week" value={week} />
      <label htmlFor={`fb-${logbookId}`} className="block text-sm font-semibold text-navy-800">
        Catatan Arahan Bimbingan (Inline Feedback)
      </label>
      <textarea
        id={`fb-${logbookId}`}
        name="feedbackNotes"
        rows={3}
        maxLength={2000}
        onChange={() => setError(null)}
        placeholder="contoh: Coba tambahkan regularisasi Weight Decay 0.01 dan uji visualisasi Attention Map."
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
      />
      <p className="text-xs text-slate-500">Catatan tersimpan di riwayat bimbingan dan langsung tampil di akun mahasiswa.</p>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <ActionButton value="REVISION_REQUESTED">Minta Revisi Logbook</ActionButton>
        <ActionButton value="APPROVED">Validasi Logbook (Valid)</ActionButton>
      </div>
    </form>
  );
}
