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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), redirect: "manual", cache: "no-store", signal: controller.signal });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.delete("keep-alive");
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ data: null, error: { code: "BACKEND_UNAVAILABLE", message: "The Subflow API could not be reached. Try again shortly." }, meta: {} }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
