/**
 * Sidik jari data inti peserta SIMPELMAS (modul murni, juga dipakai prisma/seed.ts).
 * Berbeda = data prodi sudah berubah sejak sinkron terakhir (deteksi mismatch).
 */
import { createHash } from "node:crypto";

export type FingerprintFields = {
  nim: string;
  studentName: string;
  leadLecturerNip: string;
  researchTitle: string;
  grantContractNumber: string;
  startDate: string; // YYYY-MM-DD (WIB)
};

export function participantFingerprint(p: FingerprintFields): string {
  const core = [p.nim, p.studentName, p.leadLecturerNip, p.researchTitle, p.grantContractNumber, p.startDate].join("|");
  return createHash("sha256").update(core).digest("hex").slice(0, 16);
}
