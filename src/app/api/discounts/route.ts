import { connection } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { dbCheck, endpoint, jsonBody, jsonOk, money, rate, uuid, dateOnly } from "@/lib/api/http";

const ruleSchema = z.object({
  code: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullish(),
  discount_type: z.enum(["percentage", "fixed_amount"]),
  value: money,
  minimum_spend: money.default("0.00"),
  minimum_quantity: z.string().regex(/^\d{1,9}(\.\d{1,3})?$/).default("0"),
  product_id: uuid.nullable().optional(),
  valid_from: dateOnly.nullable().optional(),
  valid_until: dateOnly.nullable().optional(),
  max_redemptions: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().default(true),
}).strict().superRefine((v, ctx) => {
  if (v.discount_type === "percentage" && Number(v.value) > 100) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage cannot exceed 100" });
  }
  if (v.valid_from && v.valid_until && v.valid_from > v.valid_until) {
    ctx.addIssue({ code: "custom", path: ["valid_until"], message: "End date precedes start date" });
  }
});

export async function GET() {
  await connection();
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff"]);
    const { data, error } = await supabase.from("discount_rules")
      .select("id,code,description,discount_type,value,minimum_spend,minimum_quantity,product_id,valid_from,valid_until,max_redemptions,redemption_count,is_active")
      .order("created_at", { ascending: false }).limit(500);
    dbCheck(error);
    return jsonOk(data ?? [], 200, { count: data?.length ?? 0 });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    const { supabase, user } = await requireRole(["admin"]);
    const input = await jsonBody(request, ruleSchema);
    const { data, error } = await supabase.from("discount_rules")
      .insert({ ...input, created_by: user.id })
      .select("*").single();
    dbCheck(error);
    return jsonOk(data, 201);
  });
}
