create type public.app_role as enum ('admin', 'staff', 'customer');
create type public.billing_interval as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.subscription_status as enum (
  'draft',
  'quotation',
  'confirmed',
  'active',
  'closed'
);
create type public.invoice_status as enum (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'void'
);
create type public.payment_method as enum (
  'cash',
  'card',
  'bank_transfer',
  'upi',
  'other'
);
create type public.discount_type as enum ('percentage', 'fixed_amount');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  company_name text,
  email text,
  phone text,
  billing_address jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_display_name_not_blank check (length(trim(display_name)) > 0)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_name_not_blank check (length(trim(name)) > 0)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  description text,
  billing_interval public.billing_interval not null default 'monthly',
  interval_count integer not null default 1,
  price numeric(12, 2) not null,
  currency text not null default 'INR',
  tax_rate numeric(5, 2) not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint plans_name_not_blank check (length(trim(name)) > 0),
  constraint plans_interval_count_positive check (interval_count > 0),
  constraint plans_price_non_negative check (price >= 0),
  constraint plans_tax_rate_valid check (tax_rate >= 0 and tax_rate <= 100),
  constraint plans_currency_iso check (currency ~ '^[A-Z]{3}$')
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'draft',
  start_date date,
  current_period_start date,
  current_period_end date,
  next_billing_date date,
  cancelled_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_period_valid check (
    current_period_end is null
    or current_period_start is null
    or current_period_end > current_period_start
  ),
  constraint subscriptions_active_dates check (
    status <> 'active'
    or (start_date is not null and next_billing_date is not null)
  )
);

create table public.subscription_lines (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint subscription_lines_description_not_blank check (length(trim(description)) > 0),
  constraint subscription_lines_quantity_positive check (quantity > 0),
  constraint subscription_lines_unit_price_non_negative check (unit_price >= 0),
  constraint subscription_lines_discount_valid check (
    discount_amount >= 0 and discount_amount <= quantity * unit_price
  ),
  constraint subscription_lines_tax_rate_valid check (tax_rate >= 0 and tax_rate <= 100)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete restrict,
  billing_period_start date not null,
  billing_period_end date not null,
  status public.invoice_status not null default 'issued',
  issued_at timestamptz not null default timezone('utc', now()),
  due_at timestamptz,
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  due_amount numeric(12, 2) generated always as (total_amount - paid_amount) stored,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invoices_period_valid check (billing_period_end > billing_period_start),
  constraint invoices_subtotal_non_negative check (subtotal_amount >= 0),
  constraint invoices_discount_valid check (
    discount_amount >= 0 and discount_amount <= subtotal_amount
  ),
  constraint invoices_tax_non_negative check (tax_amount >= 0),
  constraint invoices_total_non_negative check (total_amount >= 0),
  constraint invoices_paid_valid check (paid_amount >= 0 and paid_amount <= total_amount),
  constraint invoices_due_non_negative check (due_amount >= 0),
  constraint invoices_period_unique unique (
    subscription_id,
    billing_period_start,
    billing_period_end
  )
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint invoice_lines_description_not_blank check (length(trim(description)) > 0),
  constraint invoice_lines_quantity_positive check (quantity > 0),
  constraint invoice_lines_unit_price_non_negative check (unit_price >= 0),
  constraint invoice_lines_discount_valid check (
    discount_amount >= 0 and discount_amount <= quantity * unit_price
  ),
  constraint invoice_lines_tax_rate_valid check (tax_rate >= 0 and tax_rate <= 100),
  constraint invoice_lines_tax_non_negative check (tax_amount >= 0),
  constraint invoice_lines_total_non_negative check (line_total >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12, 2) not null,
  payment_method public.payment_method not null,
  paid_at timestamptz not null default timezone('utc', now()),
  reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint payments_amount_positive check (amount > 0)
);

create table public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type public.discount_type not null,
  value numeric(12, 2) not null,
  valid_from date,
  valid_until date,
  max_redemptions integer,
  redemption_count integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint discount_rules_code_not_blank check (length(trim(code)) > 0),
  constraint discount_rules_value_non_negative check (value >= 0),
  constraint discount_rules_percentage_valid check (
    discount_type <> 'percentage' or value <= 100
  ),
  constraint discount_rules_date_range_valid check (
    valid_until is null or valid_from is null or valid_until >= valid_from
  ),
  constraint discount_rules_redemptions_valid check (
    (max_redemptions is null or max_redemptions > 0)
    and redemption_count >= 0
  )
);

create index customers_auth_user_id_idx on public.customers(auth_user_id);
create index customers_active_idx on public.customers(is_active);
create index products_active_idx on public.products(is_active);
create index plans_product_id_idx on public.plans(product_id);
create index plans_active_idx on public.plans(is_active);
create index subscriptions_customer_id_idx on public.subscriptions(customer_id);
create index subscriptions_status_idx on public.subscriptions(status);
create index subscriptions_next_billing_date_idx
  on public.subscriptions(next_billing_date)
  where status = 'active';
create index subscription_lines_subscription_id_idx
  on public.subscription_lines(subscription_id);
create index invoices_customer_id_idx on public.invoices(customer_id);
create index invoices_subscription_id_idx on public.invoices(subscription_id);
create index invoices_status_idx on public.invoices(status);
create index invoices_due_at_idx on public.invoices(due_at);
create index invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);
create index payments_invoice_id_idx on public.payments(invoice_id);
create index payments_paid_at_idx on public.payments(paid_at);
create index discount_rules_active_idx on public.discount_rules(is_active);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger discount_rules_set_updated_at
before update on public.discount_rules
for each row execute function public.set_updated_at();

create or replace function public.apply_payment_to_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_due numeric(12, 2);
begin
  select due_amount
    into invoice_due
    from public.invoices
   where id = new.invoice_id
   for update;

  if invoice_due is null then
    raise exception 'Invoice % does not exist', new.invoice_id
      using errcode = 'foreign_key_violation';
  end if;

  if new.amount > invoice_due then
    raise exception 'Payment exceeds the invoice amount due'
      using errcode = 'check_violation';
  end if;

  update public.invoices
     set paid_amount = paid_amount + new.amount,
         status = case
           when paid_amount + new.amount = total_amount then 'paid'::public.invoice_status
           when paid_amount + new.amount > 0 then 'partially_paid'::public.invoice_status
           else status
         end
   where id = new.invoice_id;

  return new;
end;
$$;

revoke all on function public.apply_payment_to_invoice() from public;

create trigger payments_apply_to_invoice
after insert on public.payments
for each row execute function public.apply_payment_to_invoice();
