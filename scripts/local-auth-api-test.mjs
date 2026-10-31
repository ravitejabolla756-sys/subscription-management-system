import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const apiBaseUrl = process.env.SUBFLOW_API_BASE_URL ?? "http://localhost:5000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.SUBFLOW_TEST_ADMIN_EMAIL;
const adminPassword = process.env.SUBFLOW_TEST_ADMIN_PASSWORD;
const customerEmail = process.env.SUBFLOW_TEST_CUSTOMER_EMAIL;
const customerPassword = process.env.SUBFLOW_TEST_CUSTOMER_PASSWORD;

if (!supabaseUrl || !supabaseKey || !adminEmail || !adminPassword) {
  throw new Error("Required test environment is incomplete; no credentials were printed.");
}

function createSessionClient(email, password) {
  const cookies = new Map();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const { name, value } of items) {
          if (value) cookies.set(name, value);
          else cookies.delete(name);
        }
      },
    },
  });

  return {
    cookies,
    supabase,
    async signIn() {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        throw new Error(`Supabase sign-in failed: ${error?.message ?? "user was not returned"}`);
      }
      return data.user;
    },
  };
}

function cookieHeader(cookies) {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

function updateCookiesFromResponse(cookies, response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const header of setCookies) {
    const separator = header.indexOf("=");
    const end = header.indexOf(";", separator);
    if (separator > 0) {
      const name = header.slice(0, separator);
      const value = header.slice(separator + 1, end < 0 ? header.length : end);
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  }
}

async function apiRequest(cookies, path, options = {}) {
  const headers = new Headers(options.headers);
  const currentCookies = cookieHeader(cookies);
  if (currentCookies) headers.set("cookie", currentCookies);
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  updateCookiesFromResponse(cookies, response);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { response, body };
}

function result(label, status, expected, body) {
  const actual = body?.error?.code ?? body?.data?.id ?? "ok";
  console.log(`${label}: HTTP ${status} (expected ${expected}) — ${actual}`);
}

function assertStatus(label, status, expected) {
  if (status !== expected) throw new Error(`${label}: expected HTTP ${expected}, received ${status}`);
}

const unauthenticated = await fetch(`${apiBaseUrl}/api/products`);
const unauthenticatedBody = await unauthenticated.json();
result("Unauthenticated GET /api/products", unauthenticated.status, 401, unauthenticatedBody);
assertStatus("Unauthenticated GET /api/products", unauthenticated.status, 401);

const adminSession = createSessionClient(adminEmail, adminPassword);
const adminUser = await adminSession.signIn();
const { data: adminProfile, error: adminProfileError } = await adminSession.supabase
  .from("profiles")
  .select("role")
  .eq("id", adminUser.id)
  .single();
if (adminProfileError || adminProfile?.role !== "admin") {
  throw new Error(`The signed-in Admin test account is not an admin profile: ${adminProfileError?.message ?? adminProfile?.role ?? "missing"}`);
}
console.log("Admin sign-in: profile role=admin");

const adminProducts = await apiRequest(adminSession.cookies, "/api/products");
result("Admin GET /api/products", adminProducts.response.status, 200, adminProducts.body);
assertStatus("Admin GET /api/products", adminProducts.response.status, 200);

const suffix = randomUUID().slice(0, 8).toUpperCase();
const productPayload = {
  sku: `API-TEST-${suffix}`,
  name: `Authenticated API Test ${suffix}`,
  description: "Created by the local authenticated API verification harness",
  is_active: true,
};
const created = await apiRequest(adminSession.cookies, "/api/products", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(productPayload),
});
result("Admin POST /api/products", created.response.status, 201, created.body);
assertStatus("Admin POST /api/products", created.response.status, 201);
const createdProduct = created.body?.data;
if (!createdProduct?.id) throw new Error("Product creation returned no product id");

const { data: storedProduct, error: storedProductError } = await adminSession.supabase
  .from("products")
  .select("id,sku,name,description,is_active")
  .eq("id", createdProduct.id)
  .single();
if (storedProductError || !storedProduct) {
  throw new Error(`Supabase product verification failed: ${storedProductError?.message ?? "row not found"}`);
}
if (storedProduct.sku !== productPayload.sku || storedProduct.name !== productPayload.name) {
  throw new Error("Supabase product verification returned unexpected product data");
}
console.log(`Supabase product verification: stored id=${storedProduct.id}, sku=${storedProduct.sku}`);

const adminList = await apiRequest(adminSession.cookies, "/api/products");
const listed = adminList.body?.data?.some((product) => product.id === createdProduct.id);
if (!listed) throw new Error("Created product was not returned by the authenticated Admin list");
console.log("Admin product list verification: created product is present");

if (customerEmail && customerPassword) {
  const customerSession = createSessionClient(customerEmail, customerPassword);
  const customerUser = await customerSession.signIn();
  const { data: customerProfile, error: customerProfileError } = await customerSession.supabase
    .from("profiles")
    .select("role")
    .eq("id", customerUser.id)
    .single();
  if (customerProfileError || customerProfile?.role !== "customer") {
    throw new Error(`The Customer test account is not a customer profile: ${customerProfileError?.message ?? customerProfile?.role ?? "missing"}`);
  }
  console.log("Customer sign-in: profile role=customer");

  const customerProducts = await apiRequest(customerSession.cookies, "/api/products");
  result("Customer GET /api/products", customerProducts.response.status, 403, customerProducts.body);
  assertStatus("Customer GET /api/products", customerProducts.response.status, 403);

  const customerDashboard = await apiRequest(customerSession.cookies, "/api/dashboard");
  result("Customer GET /api/dashboard", customerDashboard.response.status, 403, customerDashboard.body);
  assertStatus("Customer GET /api/dashboard", customerDashboard.response.status, 403);

  const customerInvoices = await apiRequest(customerSession.cookies, "/api/invoices");
  result("Customer GET /api/invoices", customerInvoices.response.status, 200, customerInvoices.body);
  assertStatus("Customer GET /api/invoices", customerInvoices.response.status, 200);
} else {
  console.log("Customer tests: skipped because no Customer credentials were entered");
}

console.log("Authenticated API test suite: PASS");
