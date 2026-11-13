import { BadgeCheck, CircleCheck, CircleX, ShieldX } from "lucide-react";
import { MIN_GPA, type EligibilityResult } from "@/lib/siakad-mock";
import { cn } from "@/lib/utils";

/** Panel hasil verifikasi kelayakan akademik otomatis SIAKAD (BR-03, Fail Fast). */
export function SiakadVerification({ result }: { result: EligibilityResult }) {
  if (!result.found) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldX className="size-4" aria-hidden /> Verifikasi SIAKAD gagal
        </p>
        <p className="mt-1">{result.message}</p>
      </div>
    );
  }

  const { record, mandatory, eligible } = result;
  const summary = [
    `Status: ${record.status}`,
    `IPK: ${record.gpa.toFixed(2)} (${record.gpa >= MIN_GPA ? "Memenuhi Syarat" : "Tidak Memenuhi"} ≥ ${MIN_GPA.toFixed(2)})`,
    `MK Wajib: ${mandatory.percent}% Lulus`,
  ];

  return (
    <section
      role={eligible ? "status" : "alert"}
      aria-label="Verifikasi kelayakan akademik SIAKAD"
      className={cn(
        "rounded-xl border p-4",
        eligible ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      <div className="flex items-start gap-3">
        {eligible ? (
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden />
        ) : (
          <ShieldX className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">
            Verifikasi Kelayakan Akademik Otomatis (SIAKAD UTM)
          </p>
          <p className="mt-1 font-semibold">{summary.join(" | ")}</p>
          {!eligible && (
            <p className="mt-2 text-sm">
              <strong>Tolak otomatis (Fail Fast — BR-03):</strong> prasyarat akademik belum terpenuhi sehingga formulir
              pendaftaran dinonaktifkan. Silakan konsultasikan dengan Dosen Wali Anda.
            </p>
          )}
        </div>
      </div>

      <ul className="mt-3 grid gap-2 border-t border-current/10 pt-3 text-sm sm:grid-cols-3">
        {result.checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2">
            {c.passed ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-600" aria-label="Lulus cek" />
            ) : (
              <CircleX className="mt-0.5 size-4 shrink-0 text-red-600" aria-label="Gagal cek" />
            )}
            <span>
              <span className="block text-xs opacity-75">{c.label}</span>
              <span className="font-medium">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
