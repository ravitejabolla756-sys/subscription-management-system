import { z } from "zod";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { booleanFilter, dbCheck, endpoint, jsonBody, jsonOk, uuid, optionalText } from "@/lib/api/http";

const schema = z.object({
  display_name: z.string().trim().min(1).max(200),
  company_name: optionalText,
  email: z.string().email().max(254).nullable().optional(),
  phone: optionalText,
  // Accept frontend BillingAddress | null; normalize to non-null JSONB in DB.
  billing_address: z.record(z.string(), z.unknown()).nullish().transform((value) => value ?? {}),
  is_active: z.boolean().default(true),
  auth_user_id: uuid.nullable().optional(),
}).strict();

export async function GET(request: Request) {
  await connection();
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff"]);
    const params = new URL(request.url).searchParams;
    let query = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500);
    const active = booleanFilter(params.get("is_active"));
    if (active !== null) query = query.eq("is_active", active);
    const search = params.get("search")?.trim();
    if (search) query = query.ilike("display_name", "%" + search.replace(/[%_,()]/g, "") + "%");
    const { data, error } = await query;
    dbCheck(error);
    return jsonOk(data ?? [], 200, { count: data?.length ?? 0 });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    const { supabase, user } = await requireRole(["admin", "staff"]);
    const input = await jsonBody(request, schema);
    const { data, error } = await supabase.from("customers")
      .insert({ ...input, created_by: user.id }).select("*").single();
    dbCheck(error);
    return jsonOk(data, 201);
  });
}
