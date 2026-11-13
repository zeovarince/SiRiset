/**
 * Jadwal baku logbook mingguan MBKM Riset (FR-06.1, bpmn-tobe §4.5 & §8 kasus 3).
 *
 * - 16 minggu pelaksanaan, mengikuti minggu kalender Senin–Minggu (WIB).
 * - Minggu ke-1 = minggu kalender yang memuat tanggal mulai riset (validasi Koordinator).
 * - Batas pengisian baku: Jumat 23:59 WIB pada minggu tersebut.
 * - Masa tenggang Jumat–Minggu; pengisian setelah Minggu 23:59 WIB ditandai TERLAMBAT (is_late).
 *
 * Modul murni (tanpa alias "@/") agar dapat dipakai juga oleh prisma/seed.ts.
 */
import { endOfDayWIB, startOfDayWIB, toDateInputValue } from "./format";

export const TOTAL_WEEKS = 16;

function shiftIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Senin dari minggu kalender yang memuat tanggal ISO tersebut. */
function mondayOf(isoDate: string): string {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // 0 = Minggu
  return shiftIso(isoDate, dow === 0 ? -6 : 1 - dow);
}

export type WeekWindow = {
  week: number;
  /** Senin & Minggu (YYYY-MM-DD, WIB) */
  monday: string;
  sunday: string;
  /** Batas baku: Jumat 23:59:59 WIB */
  deadline: Date;
  /** Batas akhir masa tenggang: Minggu 23:59:59 WIB — lewat dari ini = TERLAMBAT */
  lateCutoff: Date;
};

export function weekWindow(startDate: Date, week: number): WeekWindow {
  const monday = shiftIso(mondayOf(toDateInputValue(startDate)), (week - 1) * 7);
  const friday = shiftIso(monday, 4);
  const sunday = shiftIso(monday, 6);
  return { week, monday, sunday, deadline: endOfDayWIB(friday), lateCutoff: endOfDayWIB(sunday) };
}

export function allWeeks(startDate: Date): WeekWindow[] {
  return Array.from({ length: TOTAL_WEEKS }, (_, i) => weekWindow(startDate, i + 1));
}

/** Minggu berjalan (1–16); 0 = belum mulai, 17 = seluruh 16 minggu telah lewat. */
export function currentWeek(startDate: Date, now = new Date()): number {
  const week1 = startOfDayWIB(mondayOf(toDateInputValue(startDate))).getTime();
  const today = startOfDayWIB(toDateInputValue(now)).getTime();
  if (today < week1) return 0;
  return Math.min(TOTAL_WEEKS + 1, Math.floor((today - week1) / (7 * 86_400_000)) + 1);
}

export function isLateSubmission(window: WeekWindow, at = new Date()): boolean {
  return at.getTime() > window.lateCutoff.getTime();
}

/** Diisi setelah Jumat 23:59 tetapi sebelum Minggu 23:59 (masa tenggang). */
export function isGraceSubmission(window: WeekWindow, at: Date): boolean {
  return at.getTime() > window.deadline.getTime() && !isLateSubmission(window, at);
}

/**
 * Persentase kepatuhan logbook (FR-06.3): logbook tepat waktu ÷ minggu yang sudah jatuh tempo.
 * Minggu jatuh tempo = minggu yang batas tenggangnya sudah lewat, ditambah minggu berjalan yang sudah diisi.
 * Minggu yang lewat tanpa logbook dihitung tidak patuh.
 */
export function complianceRate(
  startDate: Date,
  logbooks: { weekNumber: number; isLate: boolean }[],
  now = new Date(),
): { rate: number | null; onTime: number; due: number; missing: number } {
  const byWeek = new Map(logbooks.map((l) => [l.weekNumber, l]));
  let due = 0;
  let onTime = 0;
  let missing = 0;
  for (const w of allWeeks(startDate)) {
    const entry = byWeek.get(w.week);
    const passed = now.getTime() > w.lateCutoff.getTime();
    if (!passed && !entry) continue;
    due++;
    if (!entry) missing++;
    else if (!entry.isLate) onTime++;
  }
  return { rate: due ? (onTime / due) * 100 : null, onTime, due, missing };
}
