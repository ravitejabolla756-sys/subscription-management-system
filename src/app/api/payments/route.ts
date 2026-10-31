import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { ApiError,dbCheck,endpoint,jsonBody,jsonOk,money,uuid,optionalText } from "@/lib/api/http";
const schema=z.object({
 invoice_id:uuid,amount:money.refine(v=>Number(v)>0,"Amount must be positive"),
 payment_method:z.enum(["cash","card","bank_transfer","upi","other"]),
 paid_at:z.iso.datetime({offset:true}).optional(),reference:optionalText,notes:optionalText
}).strict();
export async function POST(request:Request){
 return endpoint(async()=>{
  const {supabase,user}=await requireRole(["admin","staff"]);
  const input=await jsonBody(request,schema);
  const {data:invoice,error:invoiceError}=await supabase.from("invoices").select("id,status,due_amount").eq("id",input.invoice_id).maybeSingle();
  dbCheck(invoiceError);
  if(!invoice)throw new ApiError(404,"NOT_FOUND","Invoice not found");
  if(invoice.status==="void")throw new ApiError(409,"CONFLICT","Cannot pay void invoice");
  // The database payment trigger locks the invoice and rejects concurrent overpayments.
  const {data:payment,error:paymentError}=await supabase.from("payments").insert({...input,recorded_by:user.id}).select("*").single();
  dbCheck(paymentError);
  const {data:updated,error:updateError}=await supabase.from("invoices").select("id,status,total_amount,paid_amount,due_amount").eq("id",input.invoice_id).single();
  dbCheck(updateError);
  return jsonOk({payment,invoice:updated},201);
 });
}
