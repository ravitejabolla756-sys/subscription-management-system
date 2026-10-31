import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { ApiError,dateOnly,dbCheck,endpoint,jsonBody,jsonOk,optionalText,uuid } from "@/lib/api/http";
export const runtime="nodejs";
const statuses=["draft","quotation","confirmed","active","closed"] as const;
const transitions:Record<string,string[]>={draft:["quotation"],quotation:["confirmed"],confirmed:["active"],active:["closed"],closed:[]};
const schema=z.object({status:z.enum(statuses),start_date:dateOnly.optional(),notes:optionalText}).strict();
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
  return endpoint(async()=>{
    const {supabase}=await requireRole(["admin","staff"]);
    const id=uuid.parse((await context.params).id);
    const input=await jsonBody(request,schema);
    const {data:existing,error:readError}=await supabase.from("subscriptions").select("*,plan:plans(billing_interval,interval_count)").eq("id",id).maybeSingle();
    dbCheck(readError);
    if(!existing)throw new ApiError(404,"NOT_FOUND","Subscription not found");
    if(!transitions[existing.status]?.includes(input.status))throw new ApiError(409,"INVALID_TRANSITION","Invalid subscription state transition");
    const start=input.start_date??existing.start_date??new Date().toISOString().slice(0,10);
    const values:Record<string,unknown>={status:input.status};
    if(input.notes!==undefined)values.notes=input.notes;
    if(input.start_date!==undefined)values.start_date=input.start_date;
    if(input.status==="active"){values.start_date=start;values.next_billing_date=start;}
    if(input.status==="closed"){values.closed_at=new Date().toISOString();values.next_billing_date=null;}
    // Conditional update prevents a stale client request from overwriting a transition.
    const {data,error}=await supabase.from("subscriptions").update(values).eq("id",id).eq("status",existing.status).select("*").maybeSingle();
    dbCheck(error);
    if(!data)throw new ApiError(409,"CONFLICT","Subscription changed during update");
    return jsonOk(data);
  });
}
