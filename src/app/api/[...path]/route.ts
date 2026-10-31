import { NextResponse } from "next/server";

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const backendUrl = process.env.SUBFLOW_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) {
    return NextResponse.json({ data: null, error: { code: "API_NOT_CONFIGURED", message: "Set SUBFLOW_BACKEND_URL for the admin API proxy." }, meta: {} }, { status: 503 });
  }

  const { path } = await context.params;
  const target = new URL(`/api/${path.join("/")}`, backendUrl);
  target.search = new URL(request.url).search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), redirect: "manual", cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, headers: response.headers });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
