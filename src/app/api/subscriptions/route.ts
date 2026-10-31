import { z } from "zod";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { dateOnly, dbCheck, endpoint, jsonBody, jsonOk, uuid, optionalText } from "@/lib/api/http";
const createSchema = z.object({
  customer_id: uuid, plan_id: uuid, status: z.literal("draft").default("draft"),
  start_date: dateOnly.optional(), notes: optionalText,
}).strict();
export async function GET(request: Request) {
  await connection();
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff", "customer"]);
    const p = new URL(request.url).searchParams;
    let q = supabase.from("subscriptions").select("*,customer:customers(id,display_name,email),plan:plans(id,name,price,currency,billing_interval)").order("created_at",{ascending:false}).limit(500);
    if (p.has("customer_id")) q=q.eq("customer_id",uuid.parse(p.get("customer_id")));
    if (p.has("status")) q=q.eq("status",z.enum(["draft","quotation","confirmed","active","closed"]).parse(p.get("status")));
    const {data,error}=await q; dbCheck(error);
    return jsonOk(data??[],200,{count:data?.length??0});
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff"]);
    const input=await jsonBody(request,createSchema);
    const {data,error}=await supabase.rpc("create_subscription_with_line",{
      p_customer_id:input.customer_id,
      p_plan_id:input.plan_id,
      p_start_date:input.start_date??null,
      p_notes:input.notes??null
    });
    dbCheck(error);
    return jsonOk(data,201);
  });
}
