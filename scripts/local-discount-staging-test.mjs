// Staging-only discount integration test. It intentionally leaves demo rows in
// the staging project so invoice and redemption behavior can be inspected.
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const base = process.env.SUBFLOW_API_BASE_URL ?? "http://localhost:5001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.SUBFLOW_TEST_ADMIN_EMAIL;
const adminPassword = process.env.SUBFLOW_TEST_ADMIN_PASSWORD;
const staffEmail = process.env.SUBFLOW_TEST_STAFF_EMAIL;
const staffPassword = process.env.SUBFLOW_TEST_STAFF_PASSWORD;
const customerEmail = process.env.SUBFLOW_TEST_CUSTOMER_EMAIL;
const customerPassword = process.env.SUBFLOW_TEST_CUSTOMER_PASSWORD;

if (process.env.SUBFLOW_DISCOUNT_CONFIRM !== "RUN") {
  throw new Error("Explicit staging confirmation required: SUBFLOW_DISCOUNT_CONFIRM=RUN");
}
if (!url || !key || !adminEmail || !adminPassword) {
  throw new Error("Missing staging Supabase configuration or Admin credentials");
}

const suffix = randomUUID().slice(0, 10).toUpperCase();
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
let count = 0;

function fail(label, detail) { throw new Error(`${label}: ${detail}`); }
function pass(label) { count += 1; console.log(`PASS ${count}: ${label}`); }
function assert(label, condition, detail = "assertion failed") {
  if (!condition) fail(label, detail);
  pass(label);
}
function moneyInCents(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) fail("Invalid monetary value", String(value));
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
function expectMoney(label, actual, expected) {
  assert(label, moneyInCents(actual) === expected, `expected ${expected}, got ${actual}`);
}
function session(email, password) {
  const cookies = new Map();
  const supabase = createServerClient(url, key, {
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
      if (error || !data.user) fail("Supabase sign-in", error?.message ?? "user not returned");
      return data.user;
    },
  };
}
function applyResponseCookies(cookies, response) {
  for (const entry of response.headers.getSetCookie?.() ?? []) {
    const delimiter = entry.indexOf("=");
    if (delimiter <= 0) continue;
    const end = entry.indexOf(";", delimiter);
    const name = entry.slice(0, delimiter);
    const value = entry.slice(delimiter + 1, end === -1 ? undefined : end);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
}
async function api(cookies, path, method = "GET", input) {
  const headers = new Headers({ Accept: "application/json" });
  if (input !== undefined) headers.set("content-type", "application/json");
  if (cookies?.size) headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: input === undefined ? undefined : JSON.stringify(input),
    cache: "no-store",
  });
  if (cookies) applyResponseCookies(cookies, response);
  let body = null;
  try { body = await response.json(); } catch { /* empty response */ }
  return { status: response.status, body };
}
function expectStatus(label, result, status) {
  if (result.status !== status) fail(label, `expected HTTP ${status}, got ${result.status}`);
  pass(`${label} (HTTP ${status})`);
  return result.body?.data;
}
function expectError(label, result, statuses) {
  if (!statuses.includes(result.status) || !result.body?.error?.code) {
    fail(label, `expected ${statuses.join("/")}, got HTTP ${result.status}`);
  }
  pass(`${label} (HTTP ${result.status})`);
}
async function profileRole(client, expected, label) {
  const user = await client.signIn();
  const profile = await client.supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile.error) fail(`${label} profile`, profile.error.message);
  assert(`${label} role`, profile.data.role === expected, `expected ${expected}, got ${profile.data.role}`);
}
async function readOrFail(query, label) {
  const result = await query;
  if (result.error) fail(label, result.error.message);
  return result.data;
}
async function createProduct(admin, name) {
  const data = expectStatus(`Create ${name} product`, await api(admin.cookies, "/api/products", "POST", {
    sku: `DISC-${suffix}-${name.replace(/[^A-Z]/gi, "").toUpperCase()}`,
    name: `Discount ${name} ${suffix}`,
    description: "Staging discount verification fixture",
    is_active: true,
  }), 201);
  assert(`${name} product ID`, Boolean(data?.id));
  return data;
}
async function createPlan(admin, product, name, price = "100.00") {
  return expectStatus(`Create ${name} plan`, await api(admin.cookies, "/api/plans", "POST", {
    product_id: product.id,
    name: `Discount ${name} plan ${suffix}`,
    description: "Staging discount verification fixture",
    billing_interval: "monthly",
    interval_count: 1,
    price,
    currency: "INR",
    tax_rate: "18.00",
    is_active: true,
  }), 201);
}
async function createRule(admin, name, input) {
  return expectStatus(`Create ${name} rule`, await api(admin.cookies, "/api/discounts", "POST", {
    code: `DISC-${suffix}-${name.replace(/[^A-Z]/gi, "").toUpperCase()}`,
    description: `Staging ${name} rule`,
    is_active: true,
    ...input,
  }), 201);
}
async function createActiveSubscription(admin, plan, label) {
  const sub = expectStatus(`Create ${label} subscription`, await api(admin.cookies, "/api/subscriptions", "POST", {
    customer_id: admin.customerId,
    plan_id: plan.id,
    status: "draft",
    start_date: today,
    notes: `Discount staging ${label} ${suffix}`,
  }), 201);
  for (const status of ["quotation", "confirmed", "active"]) {
    expectStatus(`${label} transition ${status}`, await api(admin.cookies, `/api/subscriptions/${sub.id}`, "PATCH", { status }), 200);
  }
  return sub;
}
async function invoiceFor(admin, subscription, label) {
  const data = expectStatus(`${label} invoice query`, await api(admin.cookies, `/api/invoices?subscription_id=${subscription.id}`), 200);
  assert(`${label} has exactly one invoice`, Array.isArray(data) && data.length === 1, `got ${data?.length ?? 0}`);
  return data[0];
}
async function bill(admin, label) {
  return expectStatus(`${label} billing run`, await api(admin.cookies, "/api/billing/run", "POST", { as_of_date: today }), 200);
}
async function ruleState(admin, rule, label) {
  return readOrFail(admin.supabase.from("discount_rules").select("redemption_count").eq("id", rule.id).single(), label);
}

console.log(`Discount staging test prefix: DISC-${suffix}`);

expectError("Anonymous discount access rejected", await api(null, "/api/discounts"), [401]);
const admin = session(adminEmail, adminPassword);
await profileRole(admin, "admin", "Admin");
expectStatus("Admin discount list", await api(admin.cookies, "/api/discounts"), 200);
expectError("Invalid percentage rejected", await api(admin.cookies, "/api/discounts", "POST", {
  code: `DISC-${suffix}-INVALID`, discount_type: "percentage", value: "100.01",
}), [400]);

const dueResponse = await admin.supabase.from("subscriptions")
  .select("id", { head: true, count: "exact" }).eq("status", "active").lte("next_billing_date", today);
if (dueResponse.error) fail("billing preflight", dueResponse.error.message);
if ((dueResponse.count ?? 0) !== 0) fail("billing preflight", `${dueResponse.count} pre-existing due subscriptions found`);
pass("Staging billing safety preflight");

const customer = expectStatus("Create staging billing customer", await api(admin.cookies, "/api/customers", "POST", {
  display_name: `Discount Staging Customer ${suffix}`,
  company_name: "SubFlow Discount Staging",
  email: `discount-${suffix.toLowerCase()}@example.test`,
  billing_address: null,
  is_active: true,
  auth_user_id: null,
}), 201);
admin.customerId = customer.id;
assert("Nullable billing address normalized", JSON.stringify(customer.billing_address) === "{}", JSON.stringify(customer.billing_address));

const percentageProduct = await createProduct(admin, "percentage");
const percentagePlan = await createPlan(admin, percentageProduct, "percentage");
const percentageRule = await createRule(admin, "percentage", {
  discount_type: "percentage", value: "10.00", product_id: percentageProduct.id,
});
const percentageSub = await createActiveSubscription(admin, percentagePlan, "percentage");
await bill(admin, "10 percent");
let invoice = await invoiceFor(admin, percentageSub, "10 percent");
expectMoney("10 percent discount", invoice.discount_amount, 1000);
expectMoney("Tax after 10 percent discount", invoice.tax_amount, 1620);
expectMoney("10 percent invoice total", invoice.total_amount, 10620);
assert("Percentage rule recorded", invoice.discount_rule_id === percentageRule.id);

const fixedProduct = await createProduct(admin, "fixed");
const fixedPlan = await createPlan(admin, fixedProduct, "fixed");
const fixedRule = await createRule(admin, "fixed", {
  discount_type: "fixed_amount", value: "15.00", product_id: fixedProduct.id,
});
const fixedSub = await createActiveSubscription(admin, fixedPlan, "fixed");
await bill(admin, "fixed amount");
invoice = await invoiceFor(admin, fixedSub, "fixed amount");
expectMoney("Fixed discount", invoice.discount_amount, 1500);
expectMoney("Tax after fixed discount", invoice.tax_amount, 1530);
expectMoney("Fixed discount invoice total", invoice.total_amount, 10030);
assert("Fixed rule recorded", invoice.discount_rule_id === fixedRule.id);

const minimumProduct = await createProduct(admin, "minimum");
const minimumPlan = await createPlan(admin, minimumProduct, "minimum");
const minimumRule = await createRule(admin, "minimum", {
  discount_type: "percentage", value: "20.00", minimum_spend: "150.00",
  minimum_quantity: "2", product_id: minimumProduct.id,
});
const minimumSub = await createActiveSubscription(admin, minimumPlan, "minimum");
const minimumLine = await readOrFail(admin.supabase.from("subscription_lines").select("id").eq("subscription_id", minimumSub.id).single(), "minimum line lookup");
await readOrFail(admin.supabase.from("subscription_lines").update({ quantity: 2 }).eq("id", minimumLine.id), "minimum quantity update");
await bill(admin, "minimum spend and quantity");
invoice = await invoiceFor(admin, minimumSub, "minimum spend and quantity");
expectMoney("Minimum rule discount", invoice.discount_amount, 4000);
assert("Minimum rule recorded", invoice.discount_rule_id === minimumRule.id);

const scopedProduct = await createProduct(admin, "scoped");
const extraProduct = await createProduct(admin, "extra");
const scopedPlan = await createPlan(admin, scopedProduct, "scoped");
const scopedRule = await createRule(admin, "product-scoped", {
  discount_type: "fixed_amount", value: "30.00", product_id: extraProduct.id,
});
const scopedSub = await createActiveSubscription(admin, scopedPlan, "product-scoped");
await readOrFail(admin.supabase.from("subscription_lines").insert({
  subscription_id: scopedSub.id, product_id: extraProduct.id, description: "Extra scoped line",
  quantity: 1, unit_price: "50.00", tax_rate: "18.00",
}), "product-scoped line insert");
await bill(admin, "product-scoped");
invoice = await invoiceFor(admin, scopedSub, "product-scoped");
const scopedLines = invoice.invoice_lines;
expectMoney("Product-scoped header discount", invoice.discount_amount, 3000);
assert("Product-scoped rule recorded", invoice.discount_rule_id === scopedRule.id);
expectMoney("Unscoped line has no promotional discount", scopedLines.find((line) => line.product_id === scopedProduct.id)?.discount_amount, 0);
expectMoney("Scoped line receives discount", scopedLines.find((line) => line.product_id === extraProduct.id)?.discount_amount, 3000);

const excludedProduct = await createProduct(admin, "excluded");
const excludedPlan = await createPlan(admin, excludedProduct, "excluded");
await createRule(admin, "expired", {
  discount_type: "fixed_amount", value: "50.00", product_id: excludedProduct.id,
  valid_until: yesterday,
});
await createRule(admin, "inactive", {
  discount_type: "fixed_amount", value: "50.00", product_id: excludedProduct.id,
  is_active: false,
});
const excludedSub = await createActiveSubscription(admin, excludedPlan, "expired-inactive");
await bill(admin, "expired and inactive");
invoice = await invoiceFor(admin, excludedSub, "expired and inactive");
expectMoney("Expired and inactive rules produce no discount", invoice.discount_amount, 0);
assert("No discount rule recorded for excluded rules", invoice.discount_rule_id === null);
expectMoney("No-discount tax remains unchanged", invoice.tax_amount, 1800);
expectMoney("No-discount total remains unchanged", invoice.total_amount, 11800);

const limitedProduct = await createProduct(admin, "limited");
const limitedPlan = await createPlan(admin, limitedProduct, "limited");
const limitedRule = await createRule(admin, "limited", {
  discount_type: "fixed_amount", value: "25.00", product_id: limitedProduct.id,
  max_redemptions: 1,
});
const limitedSubA = await createActiveSubscription(admin, limitedPlan, "limited-a");
const limitedSubB = await createActiveSubscription(admin, limitedPlan, "limited-b");
await bill(admin, "redemption limit");
const limitedInvoiceA = await invoiceFor(admin, limitedSubA, "limited-a");
const limitedInvoiceB = await invoiceFor(admin, limitedSubB, "limited-b");
const limitedDiscounts = [limitedInvoiceA, limitedInvoiceB].filter((item) => moneyInCents(item.discount_amount) > 0);
assert("Single redemption limit applies to one invoice", limitedDiscounts.length === 1, `got ${limitedDiscounts.length}`);
const limitedState = await ruleState(admin, limitedRule, "limited rule state");
assert("Redemption count stops at one", limitedState.redemption_count === 1, String(limitedState.redemption_count));

const duplicateStateBefore = await ruleState(admin, percentageRule, "duplicate rule state before");
await readOrFail(admin.supabase.from("subscriptions").update({ next_billing_date: today }).eq("id", percentageSub.id), "duplicate due-date reset");
const repeat = await bill(admin, "duplicate billing");
assert("Duplicate billing skips existing period", repeat.skipped >= 1 && repeat.processed === 0, JSON.stringify(repeat));
const duplicateInvoices = await readOrFail(admin.supabase.from("invoices").select("id").eq("subscription_id", percentageSub.id), "duplicate invoice count");
assert("Duplicate billing leaves one invoice", duplicateInvoices.length === 1, String(duplicateInvoices.length));
const duplicateStateAfter = await ruleState(admin, percentageRule, "duplicate rule state after");
assert("Duplicate billing does not redeem again", duplicateStateAfter.redemption_count === duplicateStateBefore.redemption_count);

const concurrentProduct = await createProduct(admin, "concurrent");
const concurrentPlan = await createPlan(admin, concurrentProduct, "concurrent");
const concurrentRule = await createRule(admin, "concurrent", {
  discount_type: "fixed_amount", value: "20.00", product_id: concurrentProduct.id,
  max_redemptions: 1,
});
const concurrentSubA = await createActiveSubscription(admin, concurrentPlan, "concurrent-a");
const concurrentSubB = await createActiveSubscription(admin, concurrentPlan, "concurrent-b");
await Promise.all([bill(admin, "concurrent billing A"), bill(admin, "concurrent billing B")]);
const concurrentInvoiceA = await invoiceFor(admin, concurrentSubA, "concurrent-a");
const concurrentInvoiceB = await invoiceFor(admin, concurrentSubB, "concurrent-b");
const concurrentDiscounts = [concurrentInvoiceA, concurrentInvoiceB].filter((item) => moneyInCents(item.discount_amount) > 0);
assert("Concurrent billing creates one invoice per subscription", Boolean(concurrentInvoiceA.id) && Boolean(concurrentInvoiceB.id));
assert("Concurrent redemption limit is serialized", concurrentDiscounts.length === 1, `got ${concurrentDiscounts.length}`);
const concurrentState = await ruleState(admin, concurrentRule, "concurrent rule state");
assert("Concurrent redemption count remains one", concurrentState.redemption_count === 1);

if (staffEmail && staffPassword) {
  const staff = session(staffEmail, staffPassword);
  await profileRole(staff, "staff", "Staff");
  expectStatus("Staff discount list", await api(staff.cookies, "/api/discounts"), 200);
  expectError("Staff cannot create discount", await api(staff.cookies, "/api/discounts", "POST", {
    code: `DISC-${suffix}-STAFF`, discount_type: "fixed_amount", value: "1.00",
  }), [403]);
} else {
  console.log("Staff authorization tests SKIPPED (no Staff credentials entered)");
}
if (customerEmail && customerPassword) {
  const customerClient = session(customerEmail, customerPassword);
  await profileRole(customerClient, "customer", "Customer");
  expectError("Customer cannot list discounts", await api(customerClient.cookies, "/api/discounts"), [403]);
  expectError("Customer cannot create discount", await api(customerClient.cookies, "/api/discounts", "POST", {
    code: `DISC-${suffix}-CUSTOMER`, discount_type: "fixed_amount", value: "1.00",
  }), [403]);
} else {
  console.log("Customer authorization tests SKIPPED (no Customer credentials entered)");
}

console.log(`PASS: ${count} discount staging assertions. Demo records remain in staging only.`);
