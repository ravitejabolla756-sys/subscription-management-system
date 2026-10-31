import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { ApiError, dateOnly, dbCheck, endpoint, jsonBody, jsonOk } from "@/lib/api/http";
const bodySchema = z.object({ as_of_date: dateOnly.optional() }).strict();
export async function POST(request: Request) {
  return endpoint(async () => {
    const {supabase} = await requireRole(["admin"]);
    const input = await jsonBody(request,bodySchema);
    const asOf=input.as_of_date ?? new Date().toISOString().slice(0,10);
    if(asOf>new Date().toISOString().slice(0,10)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Future as_of_date is not permitted");
    }
    const {data,error}=await supabase.rpc("run_due_billing",{p_as_of:asOf});
    dbCheck(error);
    return jsonOk(data);
  });
}
