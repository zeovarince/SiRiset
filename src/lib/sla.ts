/**
 * Kalkulasi SLA berbasis hari kerja (Senin–Jumat) menurut kalender WIB.
 * Catatan: hari libur nasional belum diperhitungkan (dapat ditambahkan lewat daftar tanggal libur).
 */
import { endOfDayWIB, toDateInputValue } from "./format";

export const SELECTION_SLA_WORKING_DAYS = 7; // BR-06

function shiftIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWorkingDay(isoDate: string): boolean {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6;
}

/** Tenggat = akhir hari (23:59:59 WIB) dari hari kerja ke-n setelah `from`. */
export function addWorkingDays(from: Date, n: number): Date {
  let iso = toDateInputValue(from);
  let added = 0;
  while (added < n) {
    iso = shiftIso(iso, 1);
    if (isWorkingDay(iso)) added++;
  }
  return endOfDayWIB(iso);
}

/** Jumlah hari kerja dalam rentang (a, b] untuk tanggal ISO a < b. */
function workingDaysBetween(a: string, b: string): number {
  let count = 0;
  for (let iso = shiftIso(a, 1); iso <= b; iso = shiftIso(iso, 1)) if (isWorkingDay(iso)) count++;
  return count;
}

export type SlaStatus =
  | { state: "on-track" | "due-soon"; workingDaysLeft: number }
  | { state: "due-today"; workingDaysLeft: 0 }
  | { state: "overdue"; workingDaysLate: number };

/** Status SLA relatif terhadap hari ini (WIB). */
export function slaStatus(deadline: Date, now = new Date()): SlaStatus {
  const today = toDateInputValue(now);
  const due = toDateInputValue(deadline);
  if (due === today) return { state: "due-today", workingDaysLeft: 0 };
  if (due > today) {
    const left = workingDaysBetween(today, due);
    return { state: left <= 2 ? "due-soon" : "on-track", workingDaysLeft: left };
  }
  return { state: "overdue", workingDaysLate: Math.max(1, workingDaysBetween(due, today)) };
}

export function slaLabel(s: SlaStatus): string {
  switch (s.state) {
    case "due-today":
      return "Batas SLA hari ini";
    case "overdue":
      return `Lewat SLA ${s.workingDaysLate} hari kerja`;
    default:
      return `Sisa waktu: ${s.workingDaysLeft} hari kerja`;
  }
}
