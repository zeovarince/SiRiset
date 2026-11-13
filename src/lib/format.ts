/**
 * Format tanggal untuk zona waktu kampus (WIB / Asia/Jakarta), independen dari zona waktu server.
 */
export const CAMPUS_TZ = "Asia/Jakarta";
const WIB_OFFSET = "+07:00";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: CAMPUS_TZ,
});

const isoDateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: CAMPUS_TZ,
});

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CAMPUS_TZ,
});

/** "13 November 2026 15.20 WIB" */
export function formatDateTime(date: Date): string {
  return `${dateTimeFmt.format(date).replace(" pukul ", " ")} WIB`;
}

/**
 * Periode akademik berjalan: Ganjil = Agustus–Januari, Genap = Februari–Juli.
 * label "Ganjil 2026/2027", code "2026/2027 Ganjil" (format api-spec §6.1).
 */
export function academicPeriod(now = new Date()) {
  const m = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: CAMPUS_TZ }).format(now));
  const y = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: CAMPUS_TZ }).format(now));
  const [term, start] = m >= 8 ? ["Ganjil", y] : m === 1 ? ["Ganjil", y - 1] : ["Genap", y - 1];
  const years = `${start}/${Number(start) + 1}`;
  return { label: `${term} ${years}`, code: `${years} ${term}` };
}

/** "05 Sep 2026" */
export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

/** "YYYY-MM-DD" menurut kalender WIB — untuk nilai <input type="date">. */
export function toDateInputValue(date: Date): string {
  return isoDateFmt.format(date);
}

/** Hari ini (WIB) dalam format "YYYY-MM-DD". */
export function todayWIB(): string {
  return toDateInputValue(new Date());
}

/** Awal hari (00:00 WIB) dari string "YYYY-MM-DD". */
export function startOfDayWIB(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000${WIB_OFFSET}`);
}

/** Akhir hari (23:59:59.999 WIB) dari string "YYYY-MM-DD". */
export function endOfDayWIB(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999${WIB_OFFSET}`);
}

/** Selisih hari kalender (WIB) dari hari ini ke tanggal target; negatif bila sudah lewat. */
export function daysUntil(date: Date): number {
  const target = startOfDayWIB(toDateInputValue(date)).getTime();
  const today = startOfDayWIB(todayWIB()).getTime();
  return Math.round((target - today) / 86_400_000);
}
