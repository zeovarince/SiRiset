import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Inisial nama untuk avatar, mengabaikan gelar akademik (Dr., S.Kom., M.Kom., dst.). */
export function initials(fullName: string): string {
  const name = fullName.split(",")[0].replace(/\b(Dr|Prof|Ir|H|Hj)\.\s*/gi, "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
