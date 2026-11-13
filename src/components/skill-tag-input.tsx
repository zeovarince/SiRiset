"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_SKILLS, SKILL_SUGGESTIONS } from "@/lib/vacancy-schema";
import { cn } from "@/lib/utils";

/**
 * Input tag kualifikasi keahlian. Setiap tag dikirim sebagai <input type="hidden" name={name}>,
 * sehingga Server Action membaca nilainya lewat formData.getAll(name).
 */
export function SkillTagInput({
  name,
  defaultValue = [],
  invalid,
  describedBy,
}: {
  name: string;
  defaultValue?: string[];
  invalid?: boolean;
  describedBy?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const has = (t: string) => tags.some((x) => x.toLowerCase() === t.toLowerCase());
  const full = tags.length >= MAX_SKILLS;

  function add(raw: string) {
    const t = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!t || has(t) || full) return;
    setTags((prev) => [...prev, t]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  const suggestions = SKILL_SUGGESTIONS.filter((s) => !has(s));

  return (
    <div>
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 shadow-sm focus-within:ring-2",
          invalid
            ? "border-red-400 focus-within:ring-red-500/20"
            : "border-slate-300 focus-within:border-navy-500 focus-within:ring-navy-500/20",
        )}
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-md bg-navy-50 py-0.5 pr-1 pl-2 text-xs font-medium text-navy-700"
          >
            {t}
            <input type="hidden" name={name} value={t} />
            <button
              type="button"
              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
              className="rounded p-0.5 text-navy-400 hover:bg-navy-100 hover:text-navy-700"
              aria-label={`Hapus ${t}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
          disabled={full}
          placeholder={tags.length ? "" : "Ketik keahlian lalu Enter…"}
          aria-label="Tambah kualifikasi keahlian"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>

      {suggestions.length > 0 && !full && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:border-navy-400 hover:bg-navy-50 hover:text-navy-700"
            >
              <Plus className="size-3" aria-hidden />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
