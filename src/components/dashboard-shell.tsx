"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { QuickDemoBar, type QuickAccount } from "@/components/quick-demo-bar";
import { RoleSwitcher, type DemoAccount } from "@/components/role-switcher";
import { DASHBOARD_HOME, NAV_ITEMS, ROLE_LABELS, type Role } from "@/lib/roles";
import { cn, initials } from "@/lib/utils";

export type ShellUser = {
  fullName: string;
  nimNip: string;
  activeRole: Role;
  roles: Role[];
};

/** Kerangka dasbor: sidebar (RBAC) + navbar (judul halaman, Role Switcher, profil, keluar). */
export function DashboardShell({
  user,
  demoAccounts,
  quickAccounts,
  children,
}: {
  user: ShellUser;
  demoAccounts: DemoAccount[];
  /** Akun Quick Demo Bar — kosong bila DEMO_MODE nonaktif. */
  quickAccounts: QuickAccount[];
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const current =
    [DASHBOARD_HOME, ...NAV_ITEMS].find((i) => i.href === pathname) ??
    NAV_ITEMS.find((i) => pathname.startsWith(`${i.href}/`));

  return (
    <div className="min-h-screen">
      <DashboardNav activeRole={user.activeRole} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="lg:pl-72 print:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-navy-800">
            {current?.label ?? "Dasbor"}
          </h1>

          <RoleSwitcher
            activeRole={user.activeRole}
            userRoles={user.roles}
            currentNimNip={user.nimNip}
            demoAccounts={demoAccounts}
          />

          <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 md:flex">
            <div className="grid size-9 place-items-center rounded-full bg-navy-800 text-sm font-semibold text-gold-400">
              {initials(user.fullName)}
            </div>
            <div className="max-w-56 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="truncate text-xs text-slate-500">
                {user.nimNip} · {ROLE_LABELS[user.activeRole]}
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </header>

        <main
          className={cn(
            "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0",
            quickAccounts.length > 0 && "pb-28",
          )}
        >
          {children}
        </main>
      </div>

      {quickAccounts.length > 0 && (
        <QuickDemoBar accounts={quickAccounts} current={{ nimNip: user.nimNip, role: user.activeRole }} />
      )}
    </div>
  );
}
