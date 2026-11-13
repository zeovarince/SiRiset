"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { NavIcon } from "@/components/nav-icon";
import { DASHBOARD_HOME, ROLE_LABELS, navItemsForRole, type NavItem, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white shadow-[inset_3px_0_0_0_var(--color-gold-500)]"
          : "text-navy-100 hover:bg-white/5 hover:text-white",
      )}
    >
      <NavIcon
        name={item.icon}
        className={cn("size-4 shrink-0", active ? "text-gold-400" : "text-navy-300 group-hover:text-navy-100")}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Sidebar navigasi dinamis — menu mengikuti peran aktif pengguna (RBAC). */
export function DashboardNav({
  activeRole,
  open,
  onClose,
}: {
  activeRole: Role;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(activeRole);
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Backdrop mobile */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-navy-950/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-800 transition-transform lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navigasi utama"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <BrandMark />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-navy-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            <NavLink item={DASHBOARD_HOME} active={isActive(DASHBOARD_HOME.href)} onNavigate={onClose} />
          </div>

          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-gold-400 uppercase">
              Modul {ROLE_LABELS[activeRole]}
            </p>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onClose} />
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-[11px] leading-relaxed text-navy-300">
          Program Studi Teknik Informatika
          <br />
          Fakultas Teknik · Universitas Trunodjoyo Madura
        </div>
      </aside>
    </>
  );
}
