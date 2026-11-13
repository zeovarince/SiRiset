"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import { decideApplicationAction } from "@/app/actions/applications";
import { cn } from "@/lib/utils";

function ConfirmButton({ decision }: { decision: "ACCEPT" | "REJECT" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60",
        decision === "ACCEPT" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700",
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {decision === "ACCEPT" ? "Ya, Terima Pelamar" : "Tolak Pelamar"}
    </button>
  );
}

/**
 * Tombol "Terima" / "Tolak" + modal konfirmasi. Penolakan wajib menyertakan alasan objektif
 * (bpmn-tobe §4.2: Notifikasi Penolakan + Alasan Objektif).
 */
export function DecisionDialog({
  applicationId,
  studentName,
  nim,
  vacancyFilter,
  canAccept,
  remainingQuota,
}: {
  applicationId: string;
  studentName: string;
  nim: string;
  vacancyFilter?: string;
  canAccept: boolean;
  remainingQuota: number;
}) {
  const acceptRef = useRef<HTMLDialogElement>(null);
  const rejectRef = useRef<HTMLDialogElement>(null);

  const dialogCls =
    "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 shadow-2xl backdrop:bg-navy-950/60";

  const hidden = (decision: "ACCEPT" | "REJECT") => (
    <>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="decision" value={decision} />
      {vacancyFilter && <input type="hidden" name="vacancyFilter" value={vacancyFilter} />}
    </>
  );

  return (
    <div className="flex justify-end gap-1.5">
      <button
        type="button"
        disabled={!canAccept}
        title={canAccept ? undefined : "Kuota riset sudah penuh"}
        onClick={() => acceptRef.current?.showModal()}
        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <Check className="size-3.5" /> Terima
      </button>
      <button
        type="button"
        onClick={() => rejectRef.current?.showModal()}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        <X className="size-3.5" /> Tolak
      </button>

      <dialog
        ref={acceptRef}
        className={dialogCls}
        onClick={(e) => e.target === acceptRef.current && acceptRef.current?.close()}
      >
        <form action={decideApplicationAction} className="space-y-4 p-6 text-left">
          {hidden("ACCEPT")}
          <div>
            <h2 className="text-lg font-bold text-navy-800">Terima Pelamar</h2>
            <p className="mt-1 text-sm text-slate-600">
              <strong>{studentName}</strong> (<span className="font-mono">{nim}</span>) akan diterima. Sisa kuota setelah
              keputusan: <strong>{Math.max(0, remainingQuota - 1)}</strong>.
              {remainingQuota - 1 <= 0 && " Lowongan akan ditutup otomatis karena kuota terpenuhi."}
            </p>
          </div>
          <div>
            <label htmlFor={`acc-notes-${applicationId}`} className="mb-1.5 block text-sm font-medium text-slate-700">
              Catatan untuk mahasiswa <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              id={`acc-notes-${applicationId}`}
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="contoh: Lolos seleksi portofolio Python dan pemahaman machine learning."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => acceptRef.current?.close()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <ConfirmButton decision="ACCEPT" />
          </div>
        </form>
      </dialog>

      <dialog
        ref={rejectRef}
        className={dialogCls}
        onClick={(e) => e.target === rejectRef.current && rejectRef.current?.close()}
      >
        <form action={decideApplicationAction} className="space-y-4 p-6 text-left">
          {hidden("REJECT")}
          <div>
            <h2 className="text-lg font-bold text-navy-800">Tolak Pelamar</h2>
            <p className="mt-1 text-sm text-slate-600">
              Alasan penolakan akan langsung tampil di pelacak status <strong>{studentName}</strong>, sehingga mahasiswa
              dapat segera mendaftar ke lowongan lain.
            </p>
          </div>
          <div>
            <label htmlFor={`rej-notes-${applicationId}`} className="mb-1.5 block text-sm font-medium text-slate-700">
              Alasan penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`rej-notes-${applicationId}`}
              name="notes"
              rows={4}
              required
              minLength={10}
              maxLength={1000}
              placeholder="contoh: Kuota telah terisi oleh pelamar dengan portofolio PyTorch yang lebih sesuai kebutuhan riset."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Minimal 10 karakter.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => rejectRef.current?.close()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <ConfirmButton decision="REJECT" />
          </div>
        </form>
      </dialog>
    </div>
  );
}
