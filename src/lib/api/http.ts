import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { AuthorizationError } from "@/lib/auth/server";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: unknown = {}) {
    super(message);
  }
}

export const uuid = z.string().uuid();
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const date = new Date(v + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v;
}, "Invalid calendar date");
export const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Use a decimal string with at most two places");
export const rate = money.refine((v) => Number(v) <= 100, "Rate must not exceed 100");
export const optionalText = z.string().trim().max(2000).nullable().optional();

export function jsonOk<T>(data: T, status = 200, meta: Record<string, unknown> = {}) {
  return NextResponse.json({ data, error: null, meta }, { status });
}

export async function jsonBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.output<T>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body");
  }
  return schema.parse(payload);
}

export function dbCheck(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new ApiError(409, "CONFLICT", "Record already exists");
  if (error.code === "23503") throw new ApiError(400, "INVALID_REFERENCE", "Referenced record does not exist");
  if (error.code === "23514" || error.code === "22P02" || error.code === "P0001") {
    throw new ApiError(400, "BUSINESS_RULE", error.message);
  }
  if (error.code === "42501") throw new ApiError(403, "FORBIDDEN", "Not authorized for this operation");
  throw new Error("Database operation failed: " + error.code);
}

export async function endpoint(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthorizationError || error instanceof ApiError) {
      return NextResponse.json({
        data: null, error: { code: error.code, message: error.message, details: error instanceof ApiError ? error.details : {} }
      }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({
        data: null, error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() }
      }, { status: 400 });
    }
    console.error("SubFlow API error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ data: null, error: { code: "INTERNAL_ERROR", message: "Unexpected server failure", details: {} } }, { status: 500 });
  }
}

export function booleanFilter(raw: string | null) {
  if (raw === null) return null;
  if (raw !== "true" && raw !== "false") throw new ApiError(400, "VALIDATION_ERROR", "is_active must be true or false");
  return raw === "true";
}
