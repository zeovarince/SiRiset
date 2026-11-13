"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ChevronDown, Loader2, UserRoundCog } from "lucide-react";
import { demoLoginAction, switchRoleAction } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export type DemoAccount = { role: Role; fullName: string; nimNip: string };

function MenuButton({ active, children }: { active?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitemradio"
      aria-checked={active}
      disabled={pending || active}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-navy-50 text-navy-800" : "text-slate-700 hover:bg-slate-100",
        "disabled:cursor-default",
      )}
    >
      <span className="grid size-4 shrink-0 place-items-center">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-navy-500" />
        ) : active ? (
          <Check className="size-4 text-navy-700" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/**
 * Role Switcher di navbar.
 * - "Peran Anda": berganti konteks di antara peran milik akun yang login (mis. Dosen Wali ⇄ Dosen Peneliti).
 * - "Mode Demo": masuk sebagai akun representatif tiap peran (hanya bila DEMO_MODE aktif).
 */
export function RoleSwitcher({
  activeRole,
  userRoles,
  currentNimNip,
  demoAccounts,
}: {
  activeRole: Role;
  userRoles: Role[];
  currentNimNip: string;
  demoAccounts: DemoAccount[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-gold-500/60 bg-gold-50 px-3 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-gold-100"
      >
        <UserRoundCog className="size-4 text-gold-600" aria-hidden />
        <span className="hidden text-xs font-medium text-slate-500 sm:inline">Peran:</span>
        <span className="max-w-32 truncate sm:max-w-none">{ROLE_LABELS[activeRole]}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="p-2">
            <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Peran Anda
            </p>
            {userRoles.map((role) => (
              <form key={role} action={switchRoleAction}>
                <input type="hidden" name="role" value={role} />
                <MenuButton active={role === activeRole}>
                  <span className="font-medium">{ROLE_LABELS[role]}</span>
                </MenuButton>
              </form>
            ))}
          </div>

          {demoAccounts.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/70 p-2">
              <p className="flex items-center gap-2 px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10px] text-navy-900">DEMO</span>
                Masuk sebagai
              </p>
              {demoAccounts.map((acc) => {
                const isCurrent = acc.nimNip === currentNimNip && acc.role === activeRole;
                return (
                  <form key={acc.role} action={demoLoginAction}>
                    <input type="hidden" name="role" value={acc.role} />
                    <MenuButton active={isCurrent}>
                      <span className="block font-medium">{ROLE_LABELS[acc.role]}</span>
                      <span className="block truncate text-xs text-slate-500">{acc.fullName}</span>
                    </MenuButton>
                  </form>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
