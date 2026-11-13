import { DashboardShell } from "@/components/dashboard-shell";
import type { QuickAccount } from "@/components/quick-demo-bar";
import type { DemoAccount } from "@/components/role-switcher";
import { isDemoMode, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_ACCOUNTS, DEMO_ROLES, QUICK_DEMO_ACCOUNTS } from "@/lib/roles";

async function loadDemoAccounts(): Promise<DemoAccount[]> {
  if (!isDemoMode()) return [];
  const users = await prisma.user.findMany({
    where: { nimNip: { in: Object.values(DEMO_ACCOUNTS) }, isActive: true },
    select: { nimNip: true, fullName: true },
  });
  const byNimNip = new Map(users.map((u) => [u.nimNip, u.fullName]));
  return DEMO_ROLES.flatMap((role) => {
    const nimNip = DEMO_ACCOUNTS[role];
    const fullName = byNimNip.get(nimNip);
    return fullName ? [{ role, nimNip, fullName }] : [];
  });
}

/** Akun Quick Demo Bar yang benar-benar ada di basis data (mis. setelah seed). */
async function loadQuickAccounts(): Promise<QuickAccount[]> {
  if (!isDemoMode()) return [];
  const users = await prisma.user.findMany({
    where: { nimNip: { in: QUICK_DEMO_ACCOUNTS.map((a) => a.nimNip) }, isActive: true },
    select: { nimNip: true, roles: { select: { roleCode: true } } },
  });
  const rolesOf = new Map(users.map((u) => [u.nimNip, u.roles.map((r) => r.roleCode as string)]));
  return QUICK_DEMO_ACCOUNTS.filter((a) => rolesOf.get(a.nimNip)?.includes(a.role));
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [demoAccounts, quickAccounts] = await Promise.all([loadDemoAccounts(), loadQuickAccounts()]);

  return (
    <DashboardShell
      user={{
        fullName: user.fullName,
        nimNip: user.nimNip,
        activeRole: user.activeRole,
        roles: user.roles,
      }}
      demoAccounts={demoAccounts}
      quickAccounts={quickAccounts}
    >
      {children}
    </DashboardShell>
  );
}
