"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AS_IS = "#94a3b8"; // slate-400
const TO_BE = "#0f2b5c"; // navy UTM

export type CycleDatum = {
  label: string;
  asIs: number;
  toBe: number;
  asIsLabel: string;
  toBeLabel: string;
  efficiency: number;
};

function CycleTooltip({ active, payload }: { active?: boolean; payload?: { payload: CycleDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-navy-800">{d.label}</p>
      <p className="text-slate-600">As-Is: <strong>{d.asIsLabel}</strong></p>
      <p className="text-slate-600">To-Be: <strong className="text-navy-800">{d.toBeLabel}</strong></p>
      <p className="mt-1 font-semibold text-green-700">Efisiensi ↓ {d.efficiency.toFixed(1)}%</p>
    </div>
  );
}

/** Grafik batang perbandingan cycle time As-Is vs To-Be (satuan hari). */
export function CycleTimeChart({ data }: { data: CycleDatum[] }) {
  return (
    <div className="h-80 w-full" role="img" aria-label="Grafik perbandingan cycle time As-Is versus To-Be">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 8 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#475569" }}
            interval={0}
            tickFormatter={(v: string) => v.replace("Waktu ", "").replace("Lead Time ", "")}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44}>
            <Label value="Hari" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: "#64748b" }} />
          </YAxis>
          <Tooltip content={<CycleTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="asIs" name="As-Is (manual)" fill={AS_IS} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="asIsLabel" position="top" style={{ fontSize: 11, fill: "#475569" }} />
          </Bar>
          <Bar dataKey="toBe" name="To-Be (SiRiset)" fill={TO_BE} radius={[4, 4, 0, 0]} minPointSize={3}>
            <LabelList dataKey="toBeLabel" position="top" style={{ fontSize: 11, fill: TO_BE, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Diagram donut kepatuhan logbook mingguan. */
export function ComplianceDonut({ onTime, late }: { onTime: number; late: number }) {
  const data = [
    { name: "Tepat Waktu", value: onTime, color: "#16a34a" },
    { name: "Terlambat", value: late, color: "#dc2626" },
  ];
  return (
    <div className="h-64 w-full" role="img" aria-label={`Kepatuhan logbook ${onTime}% tepat waktu, ${late}% terlambat`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} startAngle={90} endAngle={-270}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <Label
              position="center"
              content={({ viewBox }) => {
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <g>
                    <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: TO_BE }}>
                      {onTime.toFixed(1).replace(".", ",")}%
                    </text>
                    <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 11, fill: "#64748b" }}>
                      tepat waktu
                    </text>
                  </g>
                );
              }}
            />
          </Pie>
          <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
