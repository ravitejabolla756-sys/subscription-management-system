import { requireRole } from "@/lib/auth/server";
import { dateOnly,dbCheck,endpoint,jsonOk } from "@/lib/api/http";
export const runtime="nodejs";
export async function GET(request:Request) {
 return endpoint(async()=>{
  const {supabase}=await requireRole(["admin","staff"]);
  const p=new URL(request.url).searchParams;
  const from=p.get("from")?dateOnly.parse(p.get("from")):null;
  const to=p.get("to")?dateOnly.parse(p.get("to")):null;
  const [subs,invoices,payments]=await Promise.all([
    supabase.from("subscriptions").select("status"),
    supabase.from("invoices").select("status,due_amount,due_at"),
    (()=>{let q=supabase.from("payments").select("amount,paid_at");if(from)q=q.gte("paid_at",from+"T00:00:00Z");if(to)q=q.lt("paid_at",new Date(Date.parse(to+"T00:00:00Z")+86400000).toISOString());return q;})()
  ]);
  dbCheck(subs.error);dbCheck(invoices.error);dbCheck(payments.error);
  const summary={draft:0,quotation:0,confirmed:0,active:0,closed:0};
  for(const s of subs.data??[])if(s.status in summary)summary[s.status as keyof typeof summary]++;
  const cents=(v:unknown)=>Math.round(Number(v??0)*100);
  const collected=(payments.data??[]).reduce((a,x)=>a+cents(x.amount),0);
  const outstanding=(invoices.data??[]).filter(x=>x.status!=="void").reduce((a,x)=>a+cents(x.due_amount),0);
  const overdue=(invoices.data??[]).filter(x=>x.status!=="void"&&cents(x.due_amount)>0&&x.due_at&&Date.parse(x.due_at)<Date.now()).length;
  const fmt=(c:number)=>(c/100).toFixed(2);
  return jsonOk({
    active_subscriptions:summary.active,revenue_collected:fmt(collected),
    outstanding_amount:fmt(outstanding),overdue_invoices:overdue,subscription_summary:summary
  },200,{from,to});
 });
}
