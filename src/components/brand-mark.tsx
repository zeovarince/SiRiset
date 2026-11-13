import { cn } from "@/lib/utils";

/** Logo teks SiRiset dengan aksen emas UTM. */
export function BrandMark({ className, inverted = true }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-500 font-bold text-navy-900 shadow-sm">
        SR
      </div>
      <div className="leading-tight">
        <p className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-navy-800")}>
          Si<span className="text-gold-500">Riset</span>
        </p>
        <p className={cn("text-[11px] font-medium", inverted ? "text-navy-200" : "text-slate-500")}>
          MBKM Riset · Teknik Informatika UTM
        </p>
      </div>
    </div>
  );
}
