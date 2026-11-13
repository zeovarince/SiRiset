import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decryptSession } from "@/lib/session";
import { canAccessPath } from "@/lib/roles";

/**
 * Lapisan proteksi pertama untuk /dashboard/*:
 * 1. Tanpa sesi valid → arahkan ke /login?next=<path>.
 * 2. Peran aktif tidak berhak atas rute (RBAC matrix) → kembali ke /dashboard?denied=1.
 * Validasi lengkap terhadap basis data dilakukan lagi di layout/halaman server (getCurrentUser).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await decryptSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
    const res = NextResponse.redirect(url);
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (!canAccessPath(session.role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "?denied=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
