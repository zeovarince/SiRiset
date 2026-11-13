"use client";

import { useRef } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { GRANT_SCHEMES, type CatalogFilter } from "@/lib/vacancy-schema";

const control =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none";

/**
 * Bilah pencarian & filter katalog. Berupa form GET biasa (tetap berfungsi tanpa JavaScript);
 * dropdown langsung menerapkan filter saat diubah.
 */
export function CatalogFilters({ filter, skills }: { filter: CatalogFilter; skills: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  const active = Boolean(filter.q || filter.scheme || filter.skill);

  return (
    <form
      ref={formRef}
      method="get"
      role="search"
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={filter.q}
          maxLength={100}
          placeholder="Cari judul riset / nama dosen peneliti…"
          aria-label="Cari judul riset atau dosen peneliti"
          className={`${control} w-full pl-9`}
        />
      </div>

      <select
        name="scheme"
        defaultValue={filter.scheme ?? ""}
        onChange={submit}
        aria-label="Filter skema hibah"
        className={`${control} lg:w-64`}
      >
        <option value="">Semua skema hibah</option>
        {GRANT_SCHEMES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        name="skill"
        defaultValue={filter.skill ?? ""}
        onChange={submit}
        aria-label="Filter keahlian"
        className={`${control} lg:w-52`}
      >
        <option value="">Semua keahlian</option>
        {skills.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 lg:flex-none"
        >
          Cari
        </button>
        {active && (
          <Link
            href="/dashboard/student/vacancies"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="size-4" aria-hidden /> Reset
          </Link>
        )}
      </div>
    </form>
  );
}
