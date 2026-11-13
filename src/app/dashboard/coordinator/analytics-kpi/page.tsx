import { Database, FileCheck2, Info, Leaf, Smile, Users } from "lucide-react";
import { ComplianceDonut, CycleTimeChart, type CycleDatum } from "@/components/kpi-charts";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { academicPeriod } from "@/lib/format";
import { formatDuration, measureKpis } from "@/lib/kpi";
import {
  CYCLE_TIME_KPIS,
  KEY_METRICS,
  KPI_TABLE,
  LOGBOOK_COMPLIANCE_SCENARIO,
  efficiency,
} from "@/lib/kpi-baseline";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analitik KPI" };

/** Dasbor Eksekutif KPI SMART MBKM Riset — As-Is vs To-Be (bpmn-tobe §7). */
export default async function AnalyticsKpiPage() {
  await requireRole("KOORDINATOR_MBKM", "KAPRODI");
  const live = await measureKpis();

  const chartData: CycleDatum[] = CYCLE_TIME_KPIS.map((k) => ({
    label: k.label,
    asIs: k.asIsDays,
    toBe: k.toBeDays,
    asIsLabel: k.asIsLabel,
    toBeLabel: k.toBeLabel,
    efficiency: efficiency(k),
  }));

  const cards = [
    {
      icon: Leaf,
      title: "Paperless Rate",
      value: `${KEY_METRICS.paperlessRate}% Digital`,
      sub: `Hemat kertas: Rp 0 (As-Is ${KEY_METRICS.paperCostAsIs})`,
      live: `${live.digitalDocuments} dokumen digital · ${live.paperDocuments} berkas kertas`,
    },
    {
      icon: Database,
      title: "Data Mismatch Rate",
      value: `${live.mismatch.rate.toFixed(0)}%`,
      sub: live.mismatch.mismatch === 0 ? "100% sinkron dengan LPPM" : `${live.mismatch.mismatch} data belum sinkron`,
      live: `Terukur: ${live.mismatch.verified} peserta tervalidasi · As-Is ${KEY_METRICS.dataMismatchAsIs}`,
    },
    {
      icon: Smile,
      title: "CSAT User Satisfaction",
      value: `${KEY_METRICS.csat.toBe.toFixed(1)} / 5.0`,
      sub: `Target ≥ ${KEY_METRICS.csat.target} · As-Is ${KEY_METRICS.csat.asIs}`,
      live: KEY_METRICS.csat.source,
    },
    {
      icon: Users,
      title: "Peserta Riset Terkelola",
      value: `${live.activeParticipants} mahasiswa`,
      sub: "Aktif & selesai pada periode berjalan",
      live: `Kepatuhan logbook terukur: ${live.logbook.rate === null ? "—" : `${live.logbook.rate.toFixed(1)}%`}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-800">Dasbor Eksekutif KPI MBKM Riset</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pembuktian kuantitatif transformasi As-Is → To-Be (efisiensi waktu, kualitas, biaya, pengalaman pengguna) ·
            Periode {academicPeriod().label}
          </p>
        </div>
        <p className="flex max-w-md items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 size-3.5 shrink-0 text-navy-500" />
          Grafik & kartu memakai angka skenario bpmn-tobe §7 / UAT Kelompok 2. Panel “Terukur dari SiRiset” dihitung langsung dari
          basis data.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Kartu metrik kunci">
        {cards.map((c) => (
          <div key={c.title} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1 bg-gold-500" aria-hidden />
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <c.icon className="size-4 text-navy-500" /> {c.title}
            </div>
            <p className="mt-2 text-2xl font-bold text-navy-800 tabular-nums">{c.value}</p>
            <p className="text-xs font-medium text-green-700">{c.sub}</p>
            <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">{c.live}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-navy-800">Perbandingan Siklus Waktu (Cycle Time) As-Is vs To-Be</h3>
          <p className="mb-3 text-xs text-slate-500">Satuan hari; arahkan kursor ke batang untuk detail.</p>
          <CycleTimeChart data={chartData} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {chartData.map((d, i) => (
              <div key={d.label} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">
                  {d.label} <span className="text-slate-400">({CYCLE_TIME_KPIS[i].painPoint})</span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500 line-through">{d.asIsLabel}</span> →{" "}
                  <strong className="text-navy-800">{d.toBeLabel}</strong>
                </p>
                <p className="text-xs font-bold text-green-700">Efisiensi ↓ {d.efficiency.toFixed(d.efficiency > 99 ? 2 : 1)}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-navy-800">Kepatuhan Logbook Mingguan</h3>
          <p className="text-xs text-slate-500">To-Be (skenario) vs As-Is {LOGBOOK_COMPLIANCE_SCENARIO.asIsRange}</p>
          <ComplianceDonut onTime={LOGBOOK_COMPLIANCE_SCENARIO.onTime} late={LOGBOOK_COMPLIANCE_SCENARIO.late} />
          <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-800">
            Terukur dari SiRiset:{" "}
            <strong>{live.logbook.rate === null ? "—" : `${live.logbook.rate.toFixed(1)}%`}</strong> tepat waktu ({live.logbook.onTime}{" "}
            tepat waktu · {live.logbook.late} terlambat/tidak diisi).
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 font-semibold text-navy-800">
          <FileCheck2 className="size-4" /> Terukur dari Data SiRiset (Live)
        </h3>
        <p className="mb-3 text-xs text-slate-500">Rata-rata durasi aktual dari stempel waktu transaksi di basis data.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CYCLE_TIME_KPIS.map((k) => {
            const m = live.cycle[k.key];
            const met = m.days !== null && m.days <= k.toBeDays * 1.5;
            return (
              <div key={k.key} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] text-slate-500">{k.label}</p>
                <p className="text-lg font-bold text-navy-800">{formatDuration(m.days)}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  n = {m.n}
                  {m.days !== null && (
                    <StatusBadge tone={met ? "success" : "warning"} dot={false} className="ml-1 px-1.5 py-0 text-[10px]">
                      {met ? "sesuai target" : "di atas target"}
                    </StatusBadge>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">Tabel KPI SMART As-Is vs To-Be (bpmn-tobe §7.1)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2.5">No</th>
                <th className="px-3 py-2.5">Dimensi</th>
                <th className="px-3 py-2.5">Indikator Kinerja</th>
                <th className="px-3 py-2.5">As-Is (Baseline)</th>
                <th className="px-3 py-2.5">Target To-Be</th>
                <th className="px-5 py-2.5 text-right">Peningkatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {KPI_TABLE.map((r, i) => (
                <tr key={r.kpi}>
                  <td className="px-5 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-600">{r.dim}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.kpi}</td>
                  <td className="px-3 py-2 text-slate-500">{r.asIs}</td>
                  <td className="px-3 py-2 font-semibold text-navy-800">{r.toBe}</td>
                  <td className={cn("px-5 py-2 text-right font-bold", r.gain.startsWith("↓") ? "text-green-700" : "text-navy-700")}>{r.gain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
