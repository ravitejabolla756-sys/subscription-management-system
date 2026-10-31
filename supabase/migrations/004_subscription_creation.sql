-- Apply after 003_billing_engine.sql.
-- Create a draft subscription and its pricing snapshot in one transaction.
create or replace function public.create_subscription_with_line(
  p_customer_id uuid,
  p_plan_id uuid,
  p_start_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_plan public.plans%rowtype;
  v_subscription public.subscriptions%rowtype;
begin
  if auth.uid() is null
     or (
       public.current_app_role() is distinct from 'admin'::public.app_role
       and public.current_app_role() is distinct from 'staff'::public.app_role
     ) then
    raise exception 'Only Admin or Staff can create subscriptions'
      using errcode = '42501';
  end if;

  select *
    into v_plan
    from public.plans
   where id = p_plan_id
     and is_active;

  if not found then
    raise exception 'Active plan does not exist'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
      from public.customers
     where id = p_customer_id
       and is_active
  ) then
    raise exception 'Active customer does not exist'
      using errcode = 'P0001';
  end if;

  insert into public.subscriptions (
    customer_id,
    plan_id,
    status,
    start_date,
    notes,
    created_by
  ) values (
    p_customer_id,
    p_plan_id,
    'draft'::public.subscription_status,
    p_start_date,
    p_notes,
    auth.uid()
  )
  returning * into v_subscription;

  insert into public.subscription_lines (
    subscription_id,
    product_id,
    description,
    quantity,
    unit_price,
    tax_rate
  ) values (
    v_subscription.id,
    v_plan.product_id,
    v_plan.name,
    1,
    v_plan.price,
    v_plan.tax_rate
  );

  return to_jsonb(v_subscription);
end;
$$;

revoke all on function public.create_subscription_with_line(uuid, uuid, date, text) from public;
revoke all on function public.create_subscription_with_line(uuid, uuid, date, text) from anon;
grant execute on function public.create_subscription_with_line(uuid, uuid, date, text) to authenticated;
