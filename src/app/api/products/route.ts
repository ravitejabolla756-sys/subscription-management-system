import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { booleanFilter, dbCheck, endpoint, jsonBody, jsonOk, optionalText } from "@/lib/api/http";

export const runtime = "nodejs";
const schema = z.object({
  sku: z.string().trim().min(1).max(80).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  is_active: z.boolean().default(true),
}).strict();

export async function GET(request: Request) {
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff"]);
    const params = new URL(request.url).searchParams;
    let query = supabase.from("products").select("*").order("created_at", { ascending: false }).limit(500);
    const active = booleanFilter(params.get("is_active"));
    if (active !== null) query = query.eq("is_active", active);
    const search = params.get("search")?.trim();
    if (search) query = query.ilike("name", "%" + search.replace(/[%_,()]/g, "") + "%");
    const { data, error } = await query;
    dbCheck(error);
    return jsonOk(data ?? [], 200, { count: data?.length ?? 0 });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    const { supabase, user } = await requireRole(["admin"]);
    const input = await jsonBody(request, schema);
    const { data, error } = await supabase.from("products")
      .insert({ ...input, created_by: user.id }).select("*").single();
    dbCheck(error);
    return jsonOk(data, 201);
  });
}
