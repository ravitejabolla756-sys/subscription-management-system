import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { ApiError, booleanFilter, dbCheck, endpoint, jsonBody, jsonOk, money, rate, uuid, optionalText } from "@/lib/api/http";

export const runtime = "nodejs";
const schema = z.object({
  product_id: uuid,
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  billing_interval: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval_count: z.number().int().min(1).max(120).default(1),
  price: money,
  currency: z.string().regex(/^[A-Z]{3}$/).default("INR"),
  tax_rate: rate.default("0.00"),
  is_active: z.boolean().default(true),
}).strict();

export async function GET(request: Request) {
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff"]);
    const params = new URL(request.url).searchParams;
    let query = supabase.from("plans").select("*").order("created_at", { ascending: false }).limit(500);
    const active = booleanFilter(params.get("is_active"));
    if (active !== null) query = query.eq("is_active", active);
    const id = params.get("product_id");
    if (id) query = query.eq("product_id", uuid.parse(id));
    const { data, error } = await query;
    dbCheck(error);
    return jsonOk(data ?? [], 200, { count: data?.length ?? 0 });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    const { supabase, user } = await requireRole(["admin"]);
    const input = await jsonBody(request, schema);
    const product = await supabase.from("products").select("id,is_active").eq("id", input.product_id).maybeSingle();
    dbCheck(product.error);
    if (!product.data?.is_active) throw new ApiError(400, "BUSINESS_RULE", "Plan requires an active product");
    const { data, error } = await supabase.from("plans")
      .insert({ ...input, created_by: user.id }).select("*").single();
    dbCheck(error);
    return jsonOk(data, 201);
  });
}
