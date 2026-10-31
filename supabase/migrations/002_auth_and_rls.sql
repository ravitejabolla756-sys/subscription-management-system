create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
    from public.profiles
   where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'::public.app_role;
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in (
    'admin'::public.app_role,
    'staff'::public.app_role
  );
$$;

create or replace function public.owns_customer(customer_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.customers
     where id = customer_uuid
       and auth_user_id = auth.uid()
  );
$$;

create or replace function public.owns_subscription(subscription_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.subscriptions s
      join public.customers c on c.id = s.customer_id
     where s.id = subscription_uuid
       and c.auth_user_id = auth.uid()
  );
$$;

create or replace function public.owns_invoice(invoice_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.invoices i
      join public.customers c on c.id = i.customer_id
     where i.id = invoice_uuid
       and c.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff_or_admin() from public;
revoke all on function public.owns_customer(uuid) from public;
revoke all on function public.owns_subscription(uuid) from public;
revoke all on function public.owns_invoice(uuid) from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;
grant execute on function public.owns_customer(uuid) to authenticated;
grant execute on function public.owns_subscription(uuid) to authenticated;
grant execute on function public.owns_invoice(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.discount_rules enable row level security;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on
  public.customers,
  public.products,
  public.plans,
  public.subscriptions,
  public.subscription_lines,
  public.invoices,
  public.invoice_lines,
  public.payments,
  public.discount_rules
to authenticated;

create policy profiles_select_self_or_staff
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_staff_or_admin());

create policy customers_select_owner_or_staff
on public.customers for select to authenticated
using (public.is_staff_or_admin() or auth_user_id = auth.uid());

create policy customers_insert_staff
on public.customers for insert to authenticated
with check (public.is_staff_or_admin());

create policy customers_update_staff
on public.customers for update to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

create policy customers_delete_admin
on public.customers for delete to authenticated
using (public.is_admin());

create policy products_select_staff
on public.products for select to authenticated
using (public.is_staff_or_admin());

create policy products_insert_admin
on public.products for insert to authenticated
with check (public.is_admin());

create policy products_update_admin
on public.products for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy products_delete_admin
on public.products for delete to authenticated
using (public.is_admin());

create policy plans_select_staff
on public.plans for select to authenticated
using (public.is_staff_or_admin());

create policy plans_insert_admin
on public.plans for insert to authenticated
with check (public.is_admin());

create policy plans_update_admin
on public.plans for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy plans_delete_admin
on public.plans for delete to authenticated
using (public.is_admin());

create policy subscriptions_select_owner_or_staff
on public.subscriptions for select to authenticated
using (public.is_staff_or_admin() or public.owns_customer(customer_id));

create policy subscriptions_insert_staff
on public.subscriptions for insert to authenticated
with check (public.is_staff_or_admin());

create policy subscriptions_update_staff
on public.subscriptions for update to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

create policy subscriptions_delete_admin
on public.subscriptions for delete to authenticated
using (public.is_admin());

create policy subscription_lines_select_owner_or_staff
on public.subscription_lines for select to authenticated
using (
  public.is_staff_or_admin()
  or public.owns_subscription(subscription_id)
);

create policy subscription_lines_insert_staff
on public.subscription_lines for insert to authenticated
with check (public.is_staff_or_admin());

create policy subscription_lines_update_staff
on public.subscription_lines for update to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

create policy subscription_lines_delete_staff
on public.subscription_lines for delete to authenticated
using (public.is_staff_or_admin());

create policy invoices_select_owner_or_staff
on public.invoices for select to authenticated
using (public.is_staff_or_admin() or public.owns_invoice(id));

create policy invoices_insert_admin
on public.invoices for insert to authenticated
with check (public.is_admin());

create policy invoices_update_admin
on public.invoices for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy invoices_delete_admin
on public.invoices for delete to authenticated
using (public.is_admin());

create policy invoice_lines_select_owner_or_staff
on public.invoice_lines for select to authenticated
using (public.is_staff_or_admin() or public.owns_invoice(invoice_id));

create policy invoice_lines_insert_admin
on public.invoice_lines for insert to authenticated
with check (public.is_admin());

create policy invoice_lines_update_admin
on public.invoice_lines for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy invoice_lines_delete_admin
on public.invoice_lines for delete to authenticated
using (public.is_admin());

create policy payments_select_owner_or_staff
on public.payments for select to authenticated
using (public.is_staff_or_admin() or public.owns_invoice(invoice_id));

create policy payments_insert_staff
on public.payments for insert to authenticated
with check (public.is_staff_or_admin());

create policy discount_rules_select_staff
on public.discount_rules for select to authenticated
using (public.is_staff_or_admin());

create policy discount_rules_insert_admin
on public.discount_rules for insert to authenticated
with check (public.is_admin());

create policy discount_rules_update_admin
on public.discount_rules for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy discount_rules_delete_admin
on public.discount_rules for delete to authenticated
using (public.is_admin());
