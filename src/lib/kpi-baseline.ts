/**
 * Angka skenario KPI As-Is vs To-Be untuk Dasbor Eksekutif (Fase 8).
 *
 * SUMBER: markdown/bpmn-tobe.md §7 (Analisis KPI As-Is vs To-Be) dan skenario UAT Kelompok 2.
 * Nilai di berkas ini BUKAN hasil pengukuran sistem — ini baseline lapangan (As-Is) dan target/skenario
 * To-Be yang dipaparkan saat UAS. Pengukuran aktual dari basis data ditampilkan terpisah (lib/kpi.ts).
 * Ubah angka di sini bila hasil survei/UAT terbaru tersedia.
 */

export type CycleTimeKpi = {
  key: string;
  label: string;
  asIsDays: number;
  toBeDays: number;
  asIsLabel: string;
  toBeLabel: string;
  painPoint: string;
};

const HOUR = 1 / 24;

export const CYCLE_TIME_KPIS: CycleTimeKpi[] = [
  {
    key: "selection",
    label: "Lead Time Seleksi Pendaftar",
    asIsDays: 18,
    toBeDays: 4.2,
    asIsLabel: "18 hari",
    toBeLabel: "4,2 hari",
    painPoint: "PP2",
  },
  {
    key: "approval",
    label: "Waktu Tunggu E-Approval",
    asIsDays: 3,
    toBeDays: 8.5 * HOUR,
    asIsLabel: "3 hari",
    toBeLabel: "8,5 jam",
    painPoint: "PP3",
  },
  {
    key: "sync",
    label: "Waktu Sinkronisasi SIMPELMAS",
    asIsDays: 21,
    toBeDays: 5 / (24 * 60), // < 5 menit (real-time)
    asIsLabel: "21 hari",
    toBeLabel: "< 5 menit",
    painPoint: "PP5",
  },
  {
    key: "grade",
    label: "Waktu Terbit Konversi Nilai",
    asIsDays: 10,
    toBeDays: 0.5,
    asIsLabel: "10 hari",
    toBeLabel: "0,5 hari",
    painPoint: "PP8",
  },
];

/** Efisiensi (% pengurangan waktu) dihitung langsung dari angka As-Is & To-Be di atas. */
export function efficiency(k: Pick<CycleTimeKpi, "asIsDays" | "toBeDays">) {
  return (1 - k.toBeDays / k.asIsDays) * 100;
}

/** Skenario kepatuhan logbook To-Be (bpmn-tobe §7.1 no. 6, target ≥ 95%). */
export const LOGBOOK_COMPLIANCE_SCENARIO = { onTime: 96.2, late: 3.8, asIsRange: "35% – 50%" };

/** Kartu metrik kunci (skenario To-Be). */
export const KEY_METRICS = {
  paperlessRate: 100, // %
  paperCostAsIs: "Rp 35.000 – 60.000 / mahasiswa",
  dataMismatchAsIs: "20% – 35%",
  csat: { toBe: 4.8, asIs: 2.4, target: 4.5, source: "Survei UAT Kelompok 2 (diinput manual)" },
};

/** Tabel KPI SMART lengkap — bpmn-tobe.md §7.1. */
export const KPI_TABLE = [
  { dim: "Efisiensi", kpi: "Lead Time Seleksi Pendaftar", asIs: "10 – 21 hari kalender", toBe: "≤ 5 hari kerja", gain: "↓ 76%" },
  { dim: "Efisiensi", kpi: "Waktu Tunggu E-Approval 3 Pihak", asIs: "3 – 5 hari kerja", toBe: "≤ 12 jam kerja", gain: "↓ 85%" },
  { dim: "Efisiensi", kpi: "Waktu Sinkronisasi SIMPELMAS", asIs: "14 – 30 hari", toBe: "Real-time (< 5 menit)", gain: "↓ 99%" },
  { dim: "Efisiensi", kpi: "Waktu Proses Konversi Nilai MB04", asIs: "7 – 14 hari kerja", toBe: "≤ 1 hari kerja", gain: "↓ 90%" },
  { dim: "Kualitas", kpi: "Ketidakcocokan Data Peserta", asIs: "20% – 35%", toBe: "0% (sinkron sempurna)", gain: "↓ 100%" },
  { dim: "Kualitas", kpi: "Kepatuhan Pengisian Logbook", asIs: "35% – 50%", toBe: "≥ 95% patuh mingguan", gain: "↑ 90%" },
  { dim: "Kualitas", kpi: "Risiko Kehilangan Lembar Nilai", asIs: "Tinggi (kertas)", toBe: "Nol (basis data + QR)", gain: "↓ 100%" },
  { dim: "Biaya", kpi: "Biaya Cetak Berkas / Mahasiswa", asIs: "Rp 35.000 – 60.000", toBe: "Rp 0 (paperless)", gain: "↓ 100%" },
  { dim: "Pengalaman", kpi: "Kepuasan Pengguna (CSAT)", asIs: "2,4 / 5,0", toBe: "≥ 4,5 / 5,0", gain: "↑ 87,5%" },
  { dim: "Otomasi", kpi: "Tingkat Otomasi Proses", asIs: "15%", toBe: "78% aktivitas", gain: "↑ 420%" },
];
