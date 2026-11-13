import { Check, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "pending" | "failed" | "revision";

export type Step = {
  title: string;
  caption: string;
  state: StepState;
};

const STATE_LABEL: Record<StepState, string> = {
  done: "Selesai",
  current: "Sedang Berjalan",
  pending: "Menunggu",
  failed: "Ditolak",
  revision: "Perlu Revisi",
};

/** Stepper status alur To-Be — horizontal di layar lebar, vertikal di ponsel. */
export function StatusStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col gap-0 md:flex-row" aria-label="Tahapan pendaftaran">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const nextActive = !last && (steps[i + 1].state !== "pending" || step.state === "done");
        return (
          <li
            key={step.title}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex gap-3 pb-6 md:flex-1 md:flex-col md:items-center md:pb-0 md:text-center"
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-9 bottom-0 left-[17px] w-0.5 md:top-[17px] md:right-[calc(-50%+22px)] md:bottom-auto md:left-[calc(50%+22px)] md:h-0.5 md:w-auto",
                  step.state === "done" && nextActive ? "bg-green-500" : "bg-slate-200",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ring-4 ring-white",
                step.state === "done" && "bg-green-500 text-white",
                step.state === "current" && "bg-gold-500 text-navy-900 shadow-[0_0_0_4px_rgba(234,179,8,0.25)]",
                step.state === "pending" && "bg-slate-100 text-slate-400",
                step.state === "failed" && "bg-red-500 text-white",
                step.state === "revision" && "bg-orange-500 text-white shadow-[0_0_0_4px_rgba(249,115,22,0.25)]",
              )}
            >
              {step.state === "done" ? (
                <Check className="size-4" aria-hidden />
              ) : step.state === "failed" ? (
                <X className="size-4" aria-hidden />
              ) : step.state === "revision" ? (
                <RotateCcw className="size-4" aria-hidden />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 md:mt-3 md:px-2">
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.state === "pending"
                    ? "text-slate-400"
                    : step.state === "failed"
                      ? "text-red-700"
                      : step.state === "revision"
                        ? "text-orange-700"
                        : "text-navy-800",
                )}
              >
                {step.title}
              </p>
              <p className="text-xs text-slate-500">{step.caption}</p>
              <p
                className={cn(
                  "mt-1 text-[10px] font-bold tracking-wider uppercase",
                  step.state === "done" && "text-green-600",
                  step.state === "current" && "text-gold-600",
                  step.state === "pending" && "text-slate-400",
                  step.state === "failed" && "text-red-600",
                  step.state === "revision" && "text-orange-600",
                )}
              >
                {STATE_LABEL[step.state]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
