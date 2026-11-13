/**
 * Rubrik penilaian resmi Prodi TI UTM & konversi nilai MB04 (FR-09, Layar 6).
 * Modul murni (tanpa I/O) — dipakai server dan komponen klien untuk kalkulasi langsung.
 */
import { conversionCourses } from "./application-schema";

export const RUBRIC = [
  { key: "scoreDisciplineLogbook", no: 1, label: "Kedisiplinan & Logbook Mingguan", weight: 0.2 },
  { key: "scoreResearchQuality", no: 2, label: "Kualitas Teknis & Penguasaan Metodologi Riset", weight: 0.3 },
  { key: "scoreOutputAchievement", no: 3, label: "Pemenuhan Target Luaran Publikasi Ilmiah", weight: 0.3 },
  { key: "scoreReportPresentation", no: 4, label: "Kualitas Laporan Akhir & Presentasi Hasil", weight: 0.2 },
] as const;

export type RubricKey = (typeof RUBRIC)[number]["key"];
export type RubricScores = Record<RubricKey, number>;

/** Nilai Akhir = 0.20·S1 + 0.30·S2 + 0.30·S3 + 0.20·S4 (dibulatkan 2 desimal). */
export function finalScore(s: RubricScores): number {
  const raw = RUBRIC.reduce((sum, r) => sum + r.weight * s[r.key], 0);
  return Math.round(raw * 100) / 100;
}

export const LETTER_GRADES = ["A", "B+", "B", "C+", "C", "D", "E"] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

/** A ≥ 80 · B+ 75–79.9 · B 70–74.9 · C+ 65–69.9 · C 56–64.9 · D 45–55.9 · E < 45 */
export function letterGrade(score: number): LetterGrade {
  if (score >= 80) return "A";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "C+";
  if (score >= 56) return "C";
  if (score >= 45) return "D";
  return "E";
}

export const GRADE_POINTS: Record<LetterGrade, number> = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, D: 1, E: 0 };

const GRADE_DESC: Record<LetterGrade, string> = {
  A: "Sangat Baik",
  "B+": "Baik Sekali",
  B: "Baik",
  "C+": "Cukup Baik",
  C: "Cukup",
  D: "Kurang",
  E: "Gagal",
};

/** Huruf mutu A–C dianggap lulus sehingga paket konversi diakui penuh. */
export function isPassing(letter: LetterGrade) {
  return ["A", "B+", "B", "C+", "C"].includes(letter);
}

export function gradeSummary(score: number) {
  const letter = letterGrade(score);
  const passing = isPassing(letter);
  return {
    score,
    letter,
    description: GRADE_DESC[letter],
    passing,
    tone: passing ? (score >= 75 ? ("success" as const) : ("info" as const)) : ("danger" as const),
  };
}

/** Rincian konversi per mata kuliah (paket MB04 20 SKS + KP 2 SKS bila disetujui). */
export function gradeConversion(scheme: string, includesKp: boolean, letter: LetterGrade) {
  const { list, totalCredits } = conversionCourses(scheme, includesKp);
  const points = GRADE_POINTS[letter];
  const passing = isPassing(letter);
  const rows = list.map((c) => ({ ...c, letter, points, qualityPoints: c.credits * points }));
  return {
    rows,
    totalCredits,
    recognizedCredits: passing ? totalCredits : 0,
    totalQualityPoints: rows.reduce((n, r) => n + r.qualityPoints, 0),
    target: passing
      ? `Paket Mata Kuliah ${scheme} (${includesKp ? "20 SKS + KP 2 SKS" : "20 SKS"}) Diakui Penuh`
      : `Paket Mata Kuliah ${scheme} Tidak Diakui (huruf mutu ${letter})`,
  };
}
