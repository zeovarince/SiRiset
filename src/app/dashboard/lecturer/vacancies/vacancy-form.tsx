"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, ChevronDown, FilePlus2, Loader2, Pencil } from "lucide-react";
import { SkillTagInput } from "@/components/skill-tag-input";
import {
  GRANT_SCHEMES,
  QUOTA_MAX,
  QUOTA_MIN,
  type VacancyField,
  type VacancyFormState,
  type VacancyFormValues,
} from "@/lib/vacancy-schema";
import { cn } from "@/lib/utils";
import { saveVacancyAction } from "./actions";

const inputCls = (invalid?: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:ring-2 focus:outline-none",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-300 focus:border-navy-500 focus:ring-navy-500/20",
  );

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  intent,
  variant,
  children,
}: {
  intent: "publish" | "draft" | "save";
  variant: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("intent") === intent;
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60",
        variant === "primary"
          ? "bg-navy-800 text-white hover:bg-navy-700"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {mine && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export type EditingVacancy = VacancyFormValues & { id: string; status: string; applicantCount: number };

/**
 * Formulir publikasi / edit lowongan riset (FR-02.1).
 * Dibungkus panel yang dapat dibuka-tutup; otomatis terbuka saat edit atau saat belum ada lowongan.
 */
export function VacancyForm({
  editing,
  defaults,
  defaultOpen,
}: {
  editing?: EditingVacancy;
  defaults: VacancyFormValues;
  defaultOpen: boolean;
}) {
  const [state, formAction] = useActionState<VacancyFormState, FormData>(saveVacancyAction, { nonce: 0 });
  const [open, setOpen] = useState(defaultOpen || Boolean(editing));
  const v = state.values ?? editing ?? defaults;
  const fe = state.fieldErrors ?? {};
  const err = (k: VacancyField) => fe[k];
  const aria = (k: VacancyField) => ({
    "aria-invalid": Boolean(fe[k]) || undefined,
    "aria-describedby": `${k}-msg`,
  });

  const isOpen = open || Boolean(state.error);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-gold-50 text-gold-600 ring-1 ring-gold-200">
          {editing ? <Pencil className="size-4" /> : <FilePlus2 className="size-4" />}
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-navy-800">
            {editing ? "Edit Lowongan Riset" : "Publikasikan Lowongan Riset Baru"}
          </span>
          <span className="block text-xs text-slate-500">
            {editing
              ? editing.title
              : "Lowongan resmi berbasis kontrak hibah LPPM — menggantikan pengumuman informal di grup WhatsApp."}
          </span>
        </span>
        <ChevronDown className={cn("size-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <form key={state.nonce} action={formAction} className="space-y-5 border-t border-slate-100 px-5 py-5" noValidate>
          {editing && <input type="hidden" name="vacancyId" value={editing.id} />}

          {state.error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {state.error}
            </div>
          )}

          <Field id="title" label="Judul Riset Hibah" error={err("title")}>
            <input
              id="title"
              name="title"
              defaultValue={v.title}
              placeholder="contoh: Pengembangan Model Klasifikasi Citra Medis Berbasis Vision Transformer"
              className={inputCls(Boolean(err("title")))}
              {...aria("title")}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="grantContractNumber"
              label="Nomor Kontrak Hibah LPPM"
              hint="Sesuai surat kontrak / surat tugas LPPM UTM."
              error={err("grantContractNumber")}
            >
              <input
                id="grantContractNumber"
                name="grantContractNumber"
                defaultValue={v.grantContractNumber}
                placeholder="042/UN46.4.1/PT/2026"
                className={cn(inputCls(Boolean(err("grantContractNumber"))), "font-mono")}
                {...aria("grantContractNumber")}
              />
            </Field>

            <Field id="grantScheme" label="Skema Hibah" error={err("grantScheme")}>
              <select
                id="grantScheme"
                name="grantScheme"
                defaultValue={v.grantScheme}
                className={inputCls(Boolean(err("grantScheme")))}
                {...aria("grantScheme")}
              >
                <option value="" disabled>
                  Pilih skema hibah…
                </option>
                {GRANT_SCHEMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            id="description"
            label="Deskripsi Riset & Silabus Tugas Mahasiswa"
            hint="Jelaskan tujuan riset, ruang lingkup, dan rincian tugas teknis mahasiswa (minimal 50 karakter)."
            error={err("description")}
          >
            <textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={v.description}
              placeholder={
                "Tujuan riset …\n\nTugas mahasiswa:\n1. Kurasi & augmentasi dataset\n2. Pelatihan dan fine-tuning model\n3. Evaluasi metrik & penulisan artikel"
              }
              className={inputCls(Boolean(err("description")))}
              {...aria("description")}
            />
          </Field>

          <Field
            id="requiredSkills"
            label="Kualifikasi Keahlian"
            hint="Tekan Enter atau koma untuk menambah tag, atau pilih dari saran."
            error={err("requiredSkills")}
          >
            <SkillTagInput
              name="requiredSkills"
              defaultValue={v.requiredSkills}
              invalid={Boolean(err("requiredSkills"))}
              describedBy="requiredSkills-msg"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="quota" label="Kuota Mahasiswa" hint={`${QUOTA_MIN}–${QUOTA_MAX} orang`} error={err("quota")}>
              <select
                id="quota"
                name="quota"
                defaultValue={v.quota}
                className={inputCls(Boolean(err("quota")))}
                {...aria("quota")}
              >
                {Array.from({ length: QUOTA_MAX - QUOTA_MIN + 1 }, (_, i) => QUOTA_MIN + i).map((n) => (
                  <option key={n} value={n}>
                    {n} mahasiswa
                  </option>
                ))}
              </select>
            </Field>

            <Field id="applicationStartDate" label="Tanggal Buka Pendaftaran" error={err("applicationStartDate")}>
              <input
                id="applicationStartDate"
                name="applicationStartDate"
                type="date"
                defaultValue={v.applicationStartDate}
                className={inputCls(Boolean(err("applicationStartDate")))}
                {...aria("applicationStartDate")}
              />
            </Field>

            <Field id="applicationEndDate" label="Tanggal Tutup Pendaftaran" error={err("applicationEndDate")}>
              <input
                id="applicationEndDate"
                name="applicationEndDate"
                type="date"
                defaultValue={v.applicationEndDate}
                className={inputCls(Boolean(err("applicationEndDate")))}
                {...aria("applicationEndDate")}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
            {editing ? (
              <>
                <Link href="/dashboard/lecturer/vacancies" className="mr-auto text-sm text-slate-500 hover:text-slate-700">
                  Batal
                </Link>
                {editing.status === "DRAFT" ? (
                  <>
                    <SubmitButton intent="draft" variant="secondary">
                      Simpan Draf
                    </SubmitButton>
                    <SubmitButton intent="publish" variant="primary">
                      Simpan & Publikasikan
                    </SubmitButton>
                  </>
                ) : (
                  <SubmitButton intent="save" variant="primary">
                    Simpan Perubahan
                  </SubmitButton>
                )}
              </>
            ) : (
              <>
                <SubmitButton intent="draft" variant="secondary">
                  Simpan sebagai Draf
                </SubmitButton>
                <SubmitButton intent="publish" variant="primary">
                  Publikasikan Lowongan
                </SubmitButton>
              </>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
