import { cn } from "@/lib/utils";
import type { gradeConversion } from "@/lib/grading";

type Conversion = ReturnType<typeof gradeConversion>;

/** Rincian konversi nilai per mata kuliah paket MB04 (+ KP) beserta bobot & angka mutu. */
export function GradeConversionTable({ conversion, className }: { conversion: Conversion; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-3 py-2">Kode</th>
            <th className="px-3 py-2">Mata Kuliah Konversi</th>
            <th className="px-3 py-2 text-right">SKS</th>
            <th className="px-3 py-2 text-center">Huruf</th>
            <th className="px-3 py-2 text-right">Bobot</th>
            <th className="px-3 py-2 text-right">Mutu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {conversion.rows.map((r) => (
            <tr key={r.code}>
              <td className="px-3 py-1.5 font-mono text-xs text-slate-500">{r.code}</td>
              <td className="px-3 py-1.5 text-slate-800">{r.name}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.credits}</td>
              <td className="px-3 py-1.5 text-center font-bold text-navy-800">{r.letter}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.points.toFixed(1)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.qualityPoints.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold">
          <tr>
            <td colSpan={2} className="px-3 py-2 text-slate-700">
              SKS diakui: {conversion.recognizedCredits} / {conversion.totalCredits}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{conversion.totalCredits}</td>
            <td colSpan={2} />
            <td className="px-3 py-2 text-right tabular-nums">{conversion.totalQualityPoints.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
