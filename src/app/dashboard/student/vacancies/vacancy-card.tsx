"use client";

import { useRef } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, FileText, Hash, UserRound, X } from "lucide-react";
import { QuotaBadge, StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export type CardVacancy = {
  id: string;
  title: string;
  description: string;
  grantContractNumber: string;
  grantScheme: string;
  quota: number;
  remainingQuota: number;
  applicantCount: number;
  skills: string[];
  startLabel: string;
  deadlineLabel: string;
  daysLeft: number;
  isOpenForApplication: boolean;
  lecturer: { fullName: string; nimNip: string };
};

export type ApplyState = "open" | "applied" | "rejected" | "blocked" | "full" | "not-started";

function DeadlineText({ v }: { v: CardVacancy }) {
  const urgent = v.daysLeft <= 3;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", urgent ? "font-semibold text-red-600" : "text-slate-600")}>
      <CalendarClock className="size-3.5" aria-hidden />
      Batas: {v.deadlineLabel}
      <span className="text-slate-400">·</span>
      {v.daysLeft === 0 ? "hari ini" : `${v.daysLeft} hari lagi`}
    </span>
  );
}

function ApplyButton({ v, state, className }: { v: CardVacancy; state: ApplyState; className?: string }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold";
  if (state === "applied") {
    return (
      <span className={cn(base, "bg-green-50 text-green-700 ring-1 ring-green-600/20", className)}>
        <CheckCircle2 className="size-4" aria-hidden /> Sudah Mendaftar
      </span>
    );
  }
  if (state !== "open") {
    const label = {
      full: "Kuota Penuh",
      "not-started": `Dibuka ${v.startLabel}`,
      rejected: "Pendaftaran Ditolak",
      blocked: "Ada Pendaftaran Aktif",
    }[state];
    return (
      <span
        className={cn(base, "cursor-not-allowed bg-slate-100 text-slate-400", className)}
        aria-disabled
        title={state === "blocked" ? "FR-03.1: satu riset aktif per mahasiswa per periode" : undefined}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={`/dashboard/student/vacancies/${v.id}/apply`}
      className={cn(base, "bg-gold-500 text-navy-900 shadow-sm hover:bg-gold-400", className)}
    >
      Daftar Riset Ini
    </Link>
  );
}

/** Kartu lowongan pada Katalog Riset + dialog detail silabus. */
export function VacancyCard({ v, applyState }: { v: CardVacancy; applyState: ApplyState }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-navy-200 hover:shadow-md">
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info" dot={false}>
            {v.grantScheme}
          </StatusBadge>
          <QuotaBadge remaining={v.remainingQuota} quota={v.quota} />
        </div>

        <h3 className="mt-3 line-clamp-3 font-semibold leading-snug text-navy-800">{v.title}</h3>

        <dl className="mt-3 space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <UserRound className="size-3.5 text-slate-400" aria-hidden />
            <dt className="sr-only">Dosen peneliti</dt>
            <dd className="truncate">{v.lecturer.fullName}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="size-3.5 text-slate-400" aria-hidden />
            <dt className="sr-only">Nomor kontrak hibah</dt>
            <dd className="font-mono">{v.grantContractNumber}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Kualifikasi Keahlian</p>
          <ul className="flex flex-wrap gap-1.5">
            {v.skills.map((s) => (
              <li key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <DeadlineText v={v} />
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileText className="size-4" aria-hidden /> Lihat Detail Silabus
        </button>
        <ApplyButton v={v} state={applyState} className="flex-1" />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={`vac-${v.id}-title`}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl p-0 shadow-2xl backdrop:bg-navy-950/60"
      >
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gold-600">{v.grantScheme}</p>
              <h2 id={`vac-${v.id}-title`} className="mt-1 text-lg leading-snug font-bold text-navy-800">
                {v.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="space-y-5 overflow-y-auto px-6 py-5 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Dosen Peneliti</dt>
                <dd className="font-medium text-slate-900">{v.lecturer.fullName}</dd>
                <dd className="font-mono text-xs text-slate-500">NIP {v.lecturer.nimNip}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Nomor Kontrak Hibah LPPM</dt>
                <dd className="font-mono font-medium text-slate-900">{v.grantContractNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Periode Pendaftaran</dt>
                <dd className="font-medium text-slate-900">
                  {v.startLabel} – {v.deadlineLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Kuota & Pendaftar</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                  <QuotaBadge remaining={v.remainingQuota} quota={v.quota} />
                  <span className="text-xs text-slate-500">{v.applicantCount} pendaftar</span>
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Deskripsi Riset & Silabus Tugas
              </h3>
              <p className="whitespace-pre-line text-slate-700 leading-relaxed">{v.description}</p>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Kualifikasi Keahlian</h3>
              <ul className="flex flex-wrap gap-1.5">
                {v.skills.map((s) => (
                  <li key={s} className="rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Konversi: paket MB04 — 20 SKS. Syarat umum: IPK ≥ 3.00 dan lulus seluruh mata kuliah wajib (diverifikasi
              otomatis via SIAKAD saat mendaftar).
            </p>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <DeadlineText v={v} />
            <ApplyButton v={v} state={applyState} />
          </footer>
        </div>
      </dialog>
    </article>
  );
}
