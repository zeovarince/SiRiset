import { Timer } from "lucide-react";
import { formatDate } from "@/lib/format";
import { slaLabel, slaStatus } from "@/lib/sla";
import { StatusBadge, type Tone } from "./status-badge";

/** Countdown SLA seleksi dosen (BR-06) — hijau aman, kuning ≤ 2 hari kerja, merah hari-H / terlambat. */
export function SlaBadge({ deadline, showDate = false }: { deadline: Date; showDate?: boolean }) {
  const s = slaStatus(deadline);
  const tone: Tone = s.state === "on-track" ? "success" : s.state === "due-soon" ? "warning" : "danger";
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <StatusBadge tone={tone} dot={false}>
        <Timer className="size-3" aria-hidden />
        {slaLabel(s)}
      </StatusBadge>
      {showDate && <span className="text-[11px] text-slate-500">Tenggat {formatDate(deadline)}, 23:59 WIB</span>}
    </span>
  );
}
