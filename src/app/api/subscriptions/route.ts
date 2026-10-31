import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { ApiError, dateOnly, dbCheck, endpoint, jsonBody, jsonOk, uuid, optionalText } from "@/lib/api/http";
export const runtime = "nodejs";
const createSchema = z.object({
  customer_id: uuid, plan_id: uuid, status: z.literal("draft").default("draft"),
  start_date: dateOnly.optional(), notes: optionalText,
}).strict();
export async function GET(request: Request) {
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
    const {supabase,user}=await requireRole(["admin","staff"]);
    const input=await jsonBody(request,createSchema);
    const [{data:plan,error:planErr},{data:customer,error:customerErr}]=await Promise.all([
      supabase.from("plans").select("id,name,price,tax_rate,product_id,is_active").eq("id",input.plan_id).maybeSingle(),
      supabase.from("customers").select("id,is_active").eq("id",input.customer_id).maybeSingle()
    ]);
    dbCheck(planErr);dbCheck(customerErr);
    if (!plan?.is_active || !customer?.is_active) throw new ApiError(400,"BUSINESS_RULE","Active plan and customer required");
    const {data,error}=await supabase.from("subscriptions").insert({...input,created_by:user.id}).select("*").single();dbCheck(error);
    // Snapshot initial pricing in a subscription line; never use client-supplied amounts.
    const {error:lineError}=await supabase.from("subscription_lines").insert({
      subscription_id:data.id,product_id:plan.product_id,description:plan.name,
      quantity:1,unit_price:plan.price,tax_rate:plan.tax_rate
    });
    if (lineError) {
      // Avoid retaining an incomplete draft if a line could not be saved.
      const {error:cleanupError}=await supabase.from("subscriptions").delete().eq("id",data.id);
      if (cleanupError) console.error("Subscription rollback failed",cleanupError.code);
      dbCheck(lineError);
    }
    return jsonOk(data,201);
  });
}
