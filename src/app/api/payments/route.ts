import { z } from "zod";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { ApiError, dbCheck, endpoint, jsonBody, jsonOk, money, uuid, optionalText } from "@/lib/api/http";

const schema = z.object({
  invoice_id: uuid,
  amount: money.refine((value) => Number(value) > 0, "Amount must be positive"),
  payment_method: z.enum(["cash", "card", "bank_transfer", "upi", "other"]),
  paid_at: z.iso.datetime({ offset: true }).optional(),
  reference: optionalText,
  notes: optionalText,
}).strict();

// Member 1's typed admin client expects GET /api/payments -> PaymentRecord[].
export async function GET(request: Request) {
  await connection();
  return endpoint(async () => {
    const { supabase } = await requireRole(["admin", "staff"]);
    const params = new URL(request.url).searchParams;
    let query = supabase.from("payments")
      .select("id,invoice_id,amount,payment_method,paid_at,reference,notes")
      .order("paid_at", { ascending: false })
      .limit(500);
    const invoiceId = params.get("invoice_id");
    if (invoiceId) query = query.eq("invoice_id", uuid.parse(invoiceId));
    const { data, error } = await query;
    dbCheck(error);
    return jsonOk(data ?? [], 200, { count: data?.length ?? 0 });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    const { supabase, user } = await requireRole(["admin", "staff"]);
    const input = await jsonBody(request, schema);
    const { data: invoice, error: invoiceError } = await supabase.from("invoices")
      .select("id,status,due_amount")
      .eq("id", input.invoice_id)
      .maybeSingle();
    dbCheck(invoiceError);
    if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found");
    if (invoice.status === "void") throw new ApiError(409, "CONFLICT", "Cannot pay a void invoice");

    // The existing DB trigger enforces the balance under a row lock and updates the invoice.
    const { data: payment, error: paymentError } = await supabase.from("payments")
      .insert({ ...input, recorded_by: user.id })
      .select("id,invoice_id,amount,payment_method,paid_at,reference,notes")
      .single();
    dbCheck(paymentError);
    const { data: updated, error: updateError } = await supabase.from("invoices")
      .select("id,status,total_amount,paid_amount,due_amount")
      .eq("id", input.invoice_id)
      .single();
    dbCheck(updateError);
    // Match frontend createPayment(): Promise<PaymentRecord>.
    // The updated invoice is included as optional metadata for immediate refresh.
    return jsonOk(payment, 201, { invoice: updated });
  });
}
