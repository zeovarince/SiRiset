/**
 * REST endpoint Lowongan Riset — markdown/api-spec.md Bagian 3.
 *   GET  /api/vacancies   katalog PUBLISHED (semua peran terautentikasi)
 *   POST /api/vacancies   terbitkan lowongan baru (DOSEN_PENELITI, ADMIN)
 * Logika & validasi sama dengan Server Action (src/lib/vacancies.ts, src/lib/vacancy-schema.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, recordAudit } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { VacancyRuleError, createVacancy, listCatalog } from "@/lib/vacancies";
import { catalogFilterSchema, serializeSkills, vacancyInputSchema } from "@/lib/vacancy-schema";

function fail(statusCode: number, message: string, errors?: unknown) {
  return NextResponse.json({ success: false, statusCode, message, ...(errors ? { errors } : {}) }, { status: statusCode });
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(10),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");

  const sp = req.nextUrl.searchParams;
  const { page, limit } = paginationSchema.parse({ page: sp.get("page") ?? undefined, limit: sp.get("limit") ?? undefined });
  const filter = catalogFilterSchema.parse({
    q: sp.get("search") ?? undefined,
    scheme: sp.get("grantScheme") ?? undefined,
    skill: sp.get("skill") ?? undefined,
  });

  const all = await listCatalog(filter);
  const items = all.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    success: true,
    statusCode: 200,
    data: items.map((v) => ({
      id: v.id,
      title: v.title,
      grantContractNumber: v.grantContractNumber,
      grantScheme: v.grantScheme,
      description: v.description,
      quota: v.quota,
      enrolledCount: v.enrolledCount,
      remainingQuota: v.remainingQuota,
      requiredSkills: serializeSkills(v.skills),
      applicationStartDate: toDateInputValue(v.applicationStartDate),
      applicationEndDate: toDateInputValue(v.applicationEndDate),
      lecturer: { id: v.lecturer.id, name: v.lecturer.fullName, nimNip: v.lecturer.nimNip },
    })),
    meta: { page, limit, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / limit)) },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Autentikasi diperlukan.");
  if (user.activeRole !== "DOSEN_PENELITI" && user.activeRole !== "ADMIN") {
    return fail(403, "Hanya Dosen Peneliti yang dapat menerbitkan lowongan riset.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Body request harus berupa JSON yang valid.");
  }

  const parsed = vacancyInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(422, "Validasi gagal.", parsed.error.flatten().fieldErrors);
  }

  try {
    const created = await createVacancy(user.id, parsed.data, "PUBLISHED");
    await recordAudit({
      userId: user.id,
      action: "VACANCY_CREATE",
      entityName: "research_vacancies",
      entityId: created.id,
      payload: { ...parsed.data, status: "PUBLISHED", via: "api" },
    });
    return NextResponse.json(
      { success: true, statusCode: 201, message: "Lowongan riset berhasil dipublikasikan.", data: { id: created.id } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof VacancyRuleError) return fail(422, err.message);
    throw err;
  }
}
