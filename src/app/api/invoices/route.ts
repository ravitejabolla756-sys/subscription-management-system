import { z } from "zod";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { ApiError, dbCheck, endpoint, jsonOk, uuid } from "@/lib/api/http";
export async function GET(request:Request){
 await connection();
 return endpoint(async()=>{
  const {supabase}=await requireRole(["admin","staff","customer"]);
  const p=new URL(request.url).searchParams;
  let q=supabase.from("invoices").select("*,invoice_lines(*)").order("issued_at",{ascending:false}).limit(500);
  if(p.has("customer_id"))q=q.eq("customer_id",uuid.parse(p.get("customer_id")));
  if(p.has("subscription_id"))q=q.eq("subscription_id",uuid.parse(p.get("subscription_id")));
  if(p.has("status"))q=q.eq("status",z.enum(["draft","issued","partially_paid","paid","overdue","void"]).parse(p.get("status")));
  if(p.get("overdue_only")==="true")q=q.gt("due_amount",0).lt("due_at",new Date().toISOString()).neq("status","void");
  else if(p.has("overdue_only")&&p.get("overdue_only")!=="false")throw new ApiError(400,"VALIDATION_ERROR","Invalid overdue_only");
  const {data,error}=await q;dbCheck(error);
  return jsonOk(data??[],200,{count:data?.length??0});
 });
}
