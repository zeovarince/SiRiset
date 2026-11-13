"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, FileSearch, Loader2, Stamp, X, XCircle } from "lucide-react";
import { decideApprovalAction } from "@/app/actions/approvals";
import { cn } from "@/lib/utils";

export type ReviewItem = {
  approvalId: string;
  applicationId: string;
  roleLabel: string;
  roleFocus: string;
  student: { name: string; nim: string; gpa: string };
  siakad: { status: string; semester: number; mandatoryPercent: number } | null;
  researchTitle: string;
  contract: string;
  lecturerName: string;
  proposalTitle: string;
  courses: { code: string; name: string; credits: number }[];
  totalCredits: number;
  includesKp: boolean;
  parallel: { roleLabel: string; approverName: string; status: string; isMine: boolean }[];
};

function DecisionButton({ action, children }: { action: "APPROVE" | "REJECT"; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("action") === action;
  return (
    <button
      type="submit"
      name="action"
      value={action}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60",
        action === "APPROVE"
          ? "bg-green-600 text-white hover:bg-green-700"
          : "border border-red-300 bg-white text-red-700 hover:bg-red-50",
      )}
    >
      {mine && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function ParallelStatus({ status }: { status: string }) {
  if (status === "APPROVED") return <CheckCircle2 className="size-4 text-green-600" aria-label="Disetujui" />;
  if (status === "REJECTED") return <XCircle className="size-4 text-red-600" aria-label="Minta revisi" />;
  return <Clock className="size-4 text-amber-500" aria-label="Menunggu" />;
}

/** Modal Review & Persetujuan Instan — Layar 3 wireframe (1-Click Approval). */
export function ReviewDialog({ item }: { item: ReviewItem }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function open() {
    setOpened(true);
    setClientError(null);
    ref.current?.showModal();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const notes = String(new FormData(e.currentTarget).get("notes") ?? "").trim();
    if (submitter?.value === "REJECT" && notes.length < 10) {
      e.preventDefault();
      setClientError("Tuliskan catatan revisi minimal 10 karakter agar mahasiswa tahu bagian yang harus diperbaiki.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-700"
      >
        <FileSearch className="size-4" /> Tinjau & Putuskan
      </button>

      <dialog
        ref={ref}
        aria-labelledby={`rv-${item.approvalId}`}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[calc(100%-1.5rem)] max-w-5xl rounded-2xl p-0 shadow-2xl backdrop:bg-navy-950/60"
      >
        <div className="flex max-h-[92vh] flex-col">
          <header className="flex items-start gap-3 border-b border-slate-100 bg-navy-800 px-6 py-4 text-white">
            <Stamp className="mt-0.5 size-5 text-gold-400" aria-hidden />
            <div className="flex-1">
              <h2 id={`rv-${item.approvalId}`} className="font-bold tracking-wide">
                Modal Persetujuan Elektronik (E-Approval)
              </h2>
              <p className="text-sm text-navy-100">
                Peran Approval Anda: <strong className="text-gold-400 uppercase">{item.roleLabel}</strong> · fokus:{" "}
                {item.roleFocus}
              </p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="rounded-md p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-2">
            <div className="space-y-5 px-6 py-5 text-sm">
              <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Nama Mahasiswa</dt>
                  <dd className="font-semibold text-slate-900">{item.student.name}</dd>
                  <dd className="font-mono text-xs text-slate-500">NIM {item.student.nim}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">IPK · SIAKAD</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">{item.student.gpa}</dd>
                  {item.siakad && (
                    <dd className="text-xs text-green-700">
                      {item.siakad.status} · Smt {item.siakad.semester} · MK wajib {item.siakad.mandatoryPercent}% lulus
                    </dd>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Judul Riset Hibah</dt>
                  <dd className="font-medium text-slate-900">{item.researchTitle}</dd>
                  <dd className="font-mono text-xs text-slate-500">{item.contract}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Rencana Riset Mahasiswa</dt>
                  <dd className="font-medium text-slate-900">{item.proposalTitle}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Dosen Peneliti (Pembimbing)</dt>
                  <dd className="font-medium text-slate-900">{item.lecturerName}</dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Rencana Paket Konversi Mata Kuliah ({item.totalCredits} SKS)
                </p>
                <table className="w-full overflow-hidden rounded-lg text-xs ring-1 ring-slate-200">
                  <tbody className="divide-y divide-slate-100">
                    {item.courses.map((c, i) => (
                      <tr key={c.code} className={cn(c.code.startsWith("KP") && "bg-gold-50/60")}>
                        <td className="w-8 px-3 py-2 text-slate-400">{i + 1}.</td>
                        <td className="px-1 py-2 text-slate-800">{c.name}</td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-navy-800">{c.credits} SKS</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 font-semibold text-slate-700">
                        Total {item.includesKp && <span className="font-normal text-slate-500">(MB04 20 SKS + KP 2 SKS)</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-navy-800">{item.totalCredits} SKS</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Progres Persetujuan Paralel</p>
                <ul className="space-y-1.5">
                  {item.parallel.map((p) => (
                    <li
                      key={p.roleLabel}
                      className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", p.isMine && "bg-gold-50 ring-1 ring-gold-200")}
                    >
                      <ParallelStatus status={p.status} />
                      <span className="w-28 text-xs text-slate-500">{p.roleLabel}</span>
                      <span className="flex-1 truncate text-xs font-medium text-slate-800">
                        {p.approverName} {p.isMine && <span className="text-gold-700">(Anda)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex min-h-80 flex-col border-t border-slate-100 bg-slate-50 lg:border-t-0 lg:border-l">
              <div className="flex items-center justify-between px-4 py-2 text-xs">
                <span className="font-semibold text-slate-600">Pratinjau Proposal PDF</span>
                <a
                  href={`/api/applications/${item.applicationId}/proposal`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 font-medium text-navy-700 hover:text-navy-900"
                >
                  Buka di tab baru <ExternalLink className="size-3" />
                </a>
              </div>
              {opened ? (
                <iframe
                  src={`/api/applications/${item.applicationId}/proposal`}
                  title={`Proposal ${item.student.name}`}
                  className="min-h-80 w-full flex-1 border-0 bg-white"
                />
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>

          <form action={decideApprovalAction} onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 px-6 py-4">
            <input type="hidden" name="approvalId" value={item.approvalId} />
            <label htmlFor={`notes-${item.approvalId}`} className="block text-sm font-medium text-slate-700">
              Catatan Persetujuan / Umpan Balik{" "}
              <span className="font-normal text-slate-400">(opsional untuk setuju, wajib untuk minta perbaikan)</span>
            </label>
            <textarea
              id={`notes-${item.approvalId}`}
              name="notes"
              rows={2}
              maxLength={1000}
              onChange={() => setClientError(null)}
              placeholder="contoh: Rencana studi dan paket mata kuliah konversi MB04 sudah sangat tepat dengan peminatan."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
            />
            {clientError && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="size-3.5" /> {clientError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <DecisionButton action="REJECT">Minta Perbaikan / Tolak</DecisionButton>
              <DecisionButton action="APPROVE">
                <CheckCircle2 className="size-4" /> Setujui Dokumen (1-Click Approve)
              </DecisionButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
