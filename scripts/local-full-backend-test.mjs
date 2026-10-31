// SubFlow live integration test. Creates DEMO records in the configured Supabase project.
// Never logs passwords, auth tokens, refresh tokens or session cookies.
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const base = process.env.SUBFLOW_API_BASE_URL ?? "http://localhost:5000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.SUBFLOW_TEST_ADMIN_EMAIL;
const adminPassword = process.env.SUBFLOW_TEST_ADMIN_PASSWORD;
const customerEmail = process.env.SUBFLOW_TEST_CUSTOMER_EMAIL;
const customerPassword = process.env.SUBFLOW_TEST_CUSTOMER_PASSWORD;

if (process.env.SUBFLOW_E2E_CONFIRM !== "RUN") {
  throw new Error("Explicit confirmation required: SUBFLOW_E2E_CONFIRM=RUN");
}
if (!url || !key || !adminEmail || !adminPassword) {
  throw new Error("Missing public Supabase configuration or secure Admin terminal input");
}

const suffix = randomUUID().slice(0, 10).toUpperCase();
const today = new Date().toISOString().slice(0, 10);
const testPrefix = `SUBFLOW-E2E-${suffix}`;
let count = 0;

function ok(label) { ++count; console.log(`PASS ${count}: ${label}`); }
function fail(label, actual) { throw new Error(`${label}: ${actual}`); }
function equal(label, actual, expected) {
  if (String(actual) !== String(expected)) fail(label, `expected ${expected}, got ${actual}`);
  ok(label);
}
function assert(label, condition, extra="") {
  if (!condition) fail(label, extra || "assertion failed");
  ok(label);
}
function decimalCents(value) {
  const valueString = String(value);
  const match = valueString.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) fail("Invalid stored decimal", valueString);
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
function session(email, password) {
  const cookies = new Map();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [...cookies].map(([name,value]) => ({ name, value })),
      setAll: (items) => {
        for (const {name,value} of items) {
          if (value) cookies.set(name, value);
          else cookies.delete(name);
        }
      },
    },
  });
  return { cookies, supabase, async signIn() {
    const {data,error} = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) fail("Supabase sign-in", error?.message ?? "No user");
    return data.user;
  } };
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
async function api(cookies, path, method="GET", input) {
  const headers = new Headers({Accept:"application/json"});
  if (input !== undefined) headers.set("content-type","application/json");
  if (cookies?.size) headers.set("cookie",[...cookies].map(([n,v])=>`${n}=${v}`).join("; "));
  const response = await fetch(`${base}${path}`, {
    method, headers, body:input===undefined ? undefined : JSON.stringify(input),
    cache:"no-store",
  });
  if (cookies) applyResponseCookies(cookies,response);
  let body;
  try {body=await response.json()} catch {body=null}
  return {status:response.status,body};
}
function success(label, result, status) {
  if (result.status !== status || result.body?.error || result.body?.data === undefined) {
    fail(label, `HTTP ${result.status} ${JSON.stringify(result.body?.error ?? {}).slice(0,300)}`);
  }
  ok(`${label} (HTTP ${status})`);
  return result.body.data;
}
function expectedFailure(label,result,allowedStatuses) {
  if (!allowedStatuses.includes(result.status) || !result.body?.error?.code) {
    fail(label, `Expected ${allowedStatuses.join("/")}, received ${result.status}: ${JSON.stringify(result.body).slice(0,200)}`);
  }
  ok(`${label} (HTTP ${result.status})`);
}

console.log(`SubFlow live test: ${testPrefix}`);
console.log("This test persists sample data, and uses offline/demonstration payment records only.");

const anonymous = await api(null,"/api/products");
expectedFailure("Anonymous product access rejected",anonymous,[401]);

const admin = session(adminEmail,adminPassword);
const adminUser = await admin.signIn();
const {data:adminProfile,error:profileError} = await admin.supabase.from("profiles").select("role").eq("id",adminUser.id).single();
if (profileError) fail("Admin profile read",profileError.message);
equal("Authenticated Admin role",adminProfile.role,"admin");

const due = await admin.supabase.from("subscriptions")
  .select("id",{head:true,count:"exact"}).eq("status","active").lte("next_billing_date",today);
if (due.error) fail("Due subscription preflight", due.error.message);
if ((due.count ?? 0) !== 0) {
  throw new Error(`SAFETY STOP: ${due.count} pre-existing active subscriptions are due. Billing runs for ALL due subscriptions. Use an isolated test project or reconcile them before testing.`);
}
ok("Billing safety check: no pre-existing due subscriptions");

const dashboardBefore = success("Admin dashboard baseline",await api(admin.cookies,"/api/dashboard"),200);
const product = success("Create product",await api(admin.cookies,"/api/products","POST",{
  sku:testPrefix,name:`SubFlow Test Product ${suffix}`,description:"E2E demo fixture",is_active:true,
}),201);
assert("Product ID returned",Boolean(product?.id));
const plan = success("Create monthly plan",await api(admin.cookies,"/api/plans","POST",{
  product_id:product.id,name:`SubFlow Test Monthly ${suffix}`,description:"Monthly E2E test",
  billing_interval:"monthly",interval_count:1,price:"100.00",currency:"INR",tax_rate:"18.00",is_active:true,
}),201);
assert("Plan linked to product",plan.product_id===product.id);
const customer = success("Create customer",await api(admin.cookies,"/api/customers","POST",{
  display_name:`E2E Customer ${suffix}`,company_name:"SubFlow Demo Customer",
  email:`subflow-e2e-${suffix.toLowerCase()}@example.test`,is_active:true,billing_address:{city:"Test City",country:"IN"},auth_user_id:null,
}),201);
assert("Customer ID returned",Boolean(customer?.id));
const subscription = success("Atomic subscription creation",await api(admin.cookies,"/api/subscriptions","POST",{
  customer_id:customer.id,plan_id:plan.id,status:"draft",start_date:today,notes:`E2E ${suffix}`,
}),201);
assert("Subscription linked to plan/customer",subscription.plan_id===plan.id&&subscription.customer_id===customer.id);

const snapshot = await admin.supabase.from("subscription_lines").select("unit_price,tax_rate,quantity")
  .eq("subscription_id",subscription.id).single();
if (snapshot.error) fail("Subscription pricing snapshot",snapshot.error.message);
equal("Snapshot unit price",decimalCents(snapshot.data.unit_price),10000);
equal("Snapshot tax rate",decimalCents(snapshot.data.tax_rate),1800);

for (const status of ["quotation","confirmed","active"]) {
  const record = success(`Transition to ${status}`,
    await api(admin.cookies,`/api/subscriptions/${subscription.id}`,"PATCH",{status}),200);
  equal(`Transition persisted (${status})`,record.status,status);
}
const forbidden = await api(admin.cookies,`/api/subscriptions/${subscription.id}`,"PATCH",{status:"draft"});
expectedFailure("Invalid lifecycle reversal rejected",forbidden,[409]);

const firstBilling = success("First billing run",await api(admin.cookies,"/api/billing/run","POST",{}),200);
assert("Invoice created by billing",Array.isArray(firstBilling.created_invoice_ids) && firstBilling.created_invoice_ids.length>=1);
const list = success("Invoice list",await api(admin.cookies,`/api/invoices?subscription_id=${subscription.id}`),200);
equal("One invoice for subscription",list.length,1);
const invoice = list[0];
equal("Invoice subtotal",decimalCents(invoice.subtotal_amount),10000);
equal("Invoice tax",decimalCents(invoice.tax_amount),1800);
equal("Invoice total",decimalCents(invoice.total_amount),11800);
equal("Initial invoice due",decimalCents(invoice.due_amount),11800);
assert("Invoice contains pricing line",Array.isArray(invoice.invoice_lines)&&invoice.invoice_lines.length===1);

success("Second billing run",await api(admin.cookies,"/api/billing/run","POST",{}),200);
const again=success("Invoice list after rerun",await api(admin.cookies,`/api/invoices?subscription_id=${subscription.id}`),200);
equal("No duplicate invoice on repeat billing",again.length,1);

const partial = success("Record partial payment",await api(admin.cookies,"/api/payments","POST",{
  invoice_id:invoice.id,amount:"40.00",payment_method:"upi",reference:`${testPrefix}-P1`,notes:"E2E partial offline payment",
}),201);
assert("Payment response is typed PaymentRecord",partial.id && partial.invoice_id===invoice.id);
let updated = success("Invoice after partial payment",await api(admin.cookies,`/api/invoices?subscription_id=${subscription.id}`),200)[0];
equal("Partial paid amount",decimalCents(updated.paid_amount),4000);
equal("Partial amount due",decimalCents(updated.due_amount),7800);
equal("Partial status",updated.status,"partially_paid");

const overpay = await api(admin.cookies,"/api/payments","POST",{
  invoice_id:invoice.id,amount:"80.00",payment_method:"upi",reference:`${testPrefix}-OVERPAY`,
});
expectedFailure("Overpayment blocked",overpay,[400,409]);
updated = success("Invoice after rejected overpayment",await api(admin.cookies,`/api/invoices?subscription_id=${subscription.id}`),200)[0];
equal("Rejected payment did not alter balance",decimalCents(updated.due_amount),7800);

const final = success("Record final payment",await api(admin.cookies,"/api/payments","POST",{
  invoice_id:invoice.id,amount:"78.00",payment_method:"bank_transfer",reference:`${testPrefix}-P2`,
}),201);
assert("Final payment response type",final.id && final.invoice_id===invoice.id);
updated=success("Invoice after final payment",await api(admin.cookies,`/api/invoices?subscription_id=${subscription.id}`),200)[0];
equal("Fully paid amount",decimalCents(updated.paid_amount),11800);
equal("Outstanding invoice balance",decimalCents(updated.due_amount),0);
equal("Paid invoice status",updated.status,"paid");

const payments = success("Payments GET supported",await api(admin.cookies,`/api/payments?invoice_id=${invoice.id}`),200);
assert("Both payment records persisted",Array.isArray(payments)&&payments.filter(p=>p.invoice_id===invoice.id).length===2);
const dashboardAfter=success("Dashboard after payments",await api(admin.cookies,"/api/dashboard"),200);
assert("Active subscription increased",dashboardAfter.active_subscriptions>=dashboardBefore.active_subscriptions+1);
equal("Revenue increased by test payments",decimalCents(dashboardAfter.revenue_collected)-decimalCents(dashboardBefore.revenue_collected),11800);

const productStored = await admin.supabase.from("products").select("id").eq("id",product.id).maybeSingle();
assert("Product persisted in Supabase",!productStored.error && productStored.data?.id===product.id);

if (customerEmail && customerPassword) {
  const other = session(customerEmail,customerPassword);
  const user=await other.signIn();
  const profile=await other.supabase.from("profiles").select("role").eq("id",user.id).single();
  if(profile.error) fail("Customer profile",profile.error.message);
  equal("Customer role",profile.data.role,"customer");
  expectedFailure("Customer cannot GET plans",await api(other.cookies,"/api/plans"),[403]);
  expectedFailure("Customer cannot GET dashboard",await api(other.cookies,"/api/dashboard"),[403]);
  const customerSubs=success("Customer subscription list",await api(other.cookies,"/api/subscriptions"),200);
  const customerInvoices=success("Customer invoice list",await api(other.cookies,"/api/invoices"),200);
  assert("Other customer subscription is hidden",!customerSubs.some(x=>x.id===subscription.id));
  assert("Other customer invoice is hidden",!customerInvoices.some(x=>x.id===invoice.id));
} else {
  console.log("Customer isolation tests SKIPPED (no Customer credentials entered)");
}
console.log(`PASS: ${count} assertions. Demo prefix: ${testPrefix}`);
console.log("Persisted demo records remain in Supabase for judges' inspection.");
