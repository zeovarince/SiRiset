"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  authenticate,
  createSession,
  destroySession,
  getCurrentUser,
  isDemoMode,
  recordAudit,
} from "@/lib/auth";
import { DEMO_ACCOUNTS, QUICK_DEMO_ACCOUNTS, canAccessPath, isDemoRole, isRole } from "@/lib/roles";

export type LoginState = { error?: string; nimNip?: string };

const loginSchema = z.object({
  nimNip: z
    .string()
    .trim()
    .regex(/^\d{8,20}$/, "NIM/NIP harus berupa 8–20 digit angka."),
  password: z.string().min(1, "Password wajib diisi."),
  next: z.string().optional(),
});

function safeNext(next: string | undefined): string {
  return next && /^\/dashboard(\/[\w\-/]*)?$/.test(next) ? next : "/dashboard";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    nimNip: formData.get("nimNip"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const nimNip = String(formData.get("nimNip") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid.", nimNip };
  }

  const user = await authenticate(parsed.data.nimNip, parsed.data.password);
  if (!user || user.roles.length === 0) {
    await recordAudit({
      userId: null,
      action: "LOGIN_FAILED",
      entityName: "users",
      entityId: parsed.data.nimNip,
    });
    return { error: "NIM/NIP atau password salah.", nimNip };
  }

  await createSession(user.id, user.roles[0]);
  await recordAudit({
    userId: user.id,
    action: "LOGIN",
    entityName: "users",
    entityId: user.id,
    payload: { role: user.roles[0] },
  });
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await recordAudit({ userId: user.id, action: "LOGOUT", entityName: "users", entityId: user.id });
  }
  await destroySession();
  redirect("/login");
}

/** Ganti peran aktif di antara peran yang dimiliki pengguna saat ini. */
export async function switchRoleAction(formData: FormData) {
  const role = formData.get("role");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isRole(role) || !user.roles.includes(role)) redirect("/dashboard?denied=1");

  if (role !== user.activeRole) {
    await createSession(user.id, role);
    await recordAudit({
      userId: user.id,
      action: "SWITCH_ROLE",
      entityName: "users",
      entityId: user.id,
      payload: { from: user.activeRole, to: role },
    });
  }
  // Kembali ke halaman asal bila peran baru berhak mengaksesnya (mis. pintasan di halaman E-Approval).
  const next = String(formData.get("next") ?? "");
  redirect(next && safeNext(next) === next && canAccessPath(role, next) ? next : "/dashboard");
}

/**
 * Quick Demo Bar: ganti akun demo 1-klik tanpa logout-login (hanya DEMO_MODE & daftar putih).
 * Tetap di halaman yang sama bila peran baru berhak mengaksesnya.
 */
export async function quickSwitchAction(formData: FormData) {
  if (!isDemoMode()) redirect("/dashboard");
  const nimNip = String(formData.get("nimNip") ?? "");
  const role = formData.get("role");
  const entry = QUICK_DEMO_ACCOUNTS.find((a) => a.nimNip === nimNip && a.role === role);
  if (!entry) redirect("/dashboard");

  const target = await prisma.user.findUnique({ where: { nimNip: entry.nimNip }, include: { roles: true } });
  if (!target || !target.isActive || !target.roles.some((r) => r.roleCode === entry.role)) redirect("/login?demo=missing");

  const previous = await getCurrentUser();
  await createSession(target.id, entry.role);
  await recordAudit({
    userId: target.id,
    action: "DEMO_QUICK_SWITCH",
    entityName: "users",
    entityId: target.id,
    payload: { role: entry.role, fromUserId: previous?.id ?? null },
  });
  const next = String(formData.get("next") ?? "");
  redirect(next && safeNext(next) === next && canAccessPath(entry.role, next) ? next : "/dashboard");
}

/** Mode Demo: masuk sebagai akun representatif untuk peran tertentu (tanpa password). */
export async function demoLoginAction(formData: FormData) {
  if (!isDemoMode()) redirect("/login");

  const demoRole = formData.get("role");
  if (!isDemoRole(demoRole)) redirect("/login");

  const target = await prisma.user.findUnique({
    where: { nimNip: DEMO_ACCOUNTS[demoRole] },
    include: { roles: true },
  });
  if (!target || !target.isActive || !target.roles.some((r) => r.roleCode === demoRole)) {
    redirect("/login?demo=missing");
  }

  const previous = await getCurrentUser();
  await createSession(target.id, demoRole);
  await recordAudit({
    userId: target.id,
    action: "DEMO_LOGIN",
    entityName: "users",
    entityId: target.id,
    payload: { role: demoRole, fromUserId: previous?.id ?? null },
  });
  redirect("/dashboard");
}
