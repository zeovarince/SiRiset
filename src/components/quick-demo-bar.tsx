"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { ChevronDown, Loader2, MonitorPlay } from "lucide-react";
import { quickSwitchAction } from "@/app/actions/auth";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export type QuickAccount = { nimNip: string; role: Role; group: string; label: string };

const STORAGE_KEY = "siriset.quickDemoBar.collapsed";

function AccountButton({ account, active }: { account: QuickAccount; active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={active || pending}
      aria-current={active ? "true" : undefined}
      title={`${account.group}: ${account.label}`}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition",
        active
          ? "bg-gold-500 font-bold text-navy-900"
          : "bg-white/10 text-white hover:bg-white/20 disabled:opacity-60",
      )}
    >
      {pending && <Loader2 className="size-3 animate-spin" />}
      <span className={cn(active ? "text-navy-900/70" : "text-gold-400")}>{account.group}:</span>
      {account.label}
    </button>
  );
}

/**
 * Quick Demo Bar — bar mengambang di bawah layar untuk berganti akun demo dengan 1 klik
 * (tanpa logout-login). Hanya dirender bila DEMO_MODE aktif. Dapat diciutkan; status diingat per peramban.
 */
export function QuickDemoBar({ accounts, current }: { accounts: QuickAccount[]; current: { nimNip: string; role: Role } }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* penyimpanan tidak tersedia — gunakan default */
    }
  }, []);

  function toggle(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* abaikan */
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => toggle(false)}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-navy-800 px-4 py-2 text-xs font-semibold text-white shadow-xl ring-2 ring-gold-500 hover:bg-navy-700 print:hidden"
        aria-label="Buka Quick Demo Bar"
      >
        <MonitorPlay className="size-4 text-gold-400" /> Mode Demo
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Quick Demo Bar — ganti akun demo"
      className="fixed inset-x-2 bottom-3 z-40 mx-auto flex max-w-6xl items-center gap-2 rounded-2xl bg-navy-900/95 p-2 shadow-2xl ring-1 ring-gold-500/60 backdrop-blur lg:left-[calc(18rem+0.5rem)] print:hidden"
    >
      <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold-500 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-navy-900 uppercase">
        <MonitorPlay className="size-4" /> <span className="hidden sm:inline">Mode Demo</span>
      </span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:thin]">
        {accounts.map((a) => (
          <form key={`${a.nimNip}-${a.role}`} action={quickSwitchAction}>
            <input type="hidden" name="nimNip" value={a.nimNip} />
            <input type="hidden" name="role" value={a.role} />
            <input type="hidden" name="next" value={pathname} />
            <AccountButton account={a} active={a.nimNip === current.nimNip && a.role === current.role} />
          </form>
        ))}
      </div>
      <button
        type="button"
        onClick={() => toggle(true)}
        className="shrink-0 rounded-lg p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"
        aria-label="Ciutkan Quick Demo Bar"
        title="Ciutkan"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
