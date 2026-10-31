-- Apply after 001 and 002. Safe to run once on the hackathon database.
-- Permit only one invoice for a given subscription and period start.
alter table public.invoices drop constraint if exists invoices_period_unique;
alter table public.invoices add constraint invoices_period_unique
  unique (subscription_id, billing_period_start);

-- Fully atomic invoice creation, line snapshots and billing-date advancement.
create or replace function public.run_due_billing(p_as_of date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  li record;
  v_start date;
  v_end date;
  v_invoice uuid;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_tax numeric(12,2);
  v_total numeric(12,2);
  v_base numeric(12,2);
  v_net numeric(12,2);
  v_line_tax numeric(12,2);
  v_count integer := 0;
  v_skipped integer := 0;
  v_ids jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or (select public.current_app_role()) is distinct from 'admin'::public.app_role then
    raise exception 'Only an admin can run billing' using errcode = '42501';
  end if;
  if p_as_of > (now() at time zone 'UTC')::date then
    raise exception 'Future billing dates are not permitted' using errcode = '22023';
  end if;

  for s in
    select sub.id,sub.customer_id,sub.next_billing_date,sub.plan_id,
           p.billing_interval,p.interval_count
      from public.subscriptions sub
      join public.plans p on p.id=sub.plan_id
     where sub.status='active'
       and sub.next_billing_date<=p_as_of
     order by sub.next_billing_date,sub.id
     for update of sub skip locked
     limit 250
  loop
    v_start:=s.next_billing_date;
    v_end:=case s.billing_interval
      when 'daily' then v_start+s.interval_count
      when 'weekly' then v_start+(7*s.interval_count)
      when 'monthly' then (v_start+make_interval(months=>s.interval_count))::date
      when 'yearly' then (v_start+make_interval(years=>s.interval_count))::date
    end;
    if v_end is null or v_end<=v_start then
      raise exception 'Invalid billing interval for subscription %',s.id;
    end if;
    if exists(select 1 from public.invoices where subscription_id=s.id and billing_period_start=v_start) then
      -- Recover from a prior invoice without generating a second bill.
      update public.subscriptions
         set next_billing_date=v_end,current_period_start=v_start,current_period_end=v_end
       where id=s.id;
      v_skipped:=v_skipped+1;
      continue;
    end if;
    select coalesce(sum(round(quantity*unit_price,2)),0),
           coalesce(sum(discount_amount),0),
           coalesce(sum(round((quantity*unit_price-discount_amount)*tax_rate/100,2)),0)
      into v_subtotal,v_discount,v_tax
      from public.subscription_lines where subscription_id=s.id;
    if not exists(select 1 from public.subscription_lines where subscription_id=s.id) then
      raise exception 'Subscription % has no billable lines',s.id;
    end if;
    v_total:=v_subtotal-v_discount+v_tax;
    insert into public.invoices (
      invoice_number,subscription_id,customer_id,billing_period_start,billing_period_end,
      status,due_at,subtotal_amount,discount_amount,tax_amount,total_amount,paid_amount,created_by
    ) values (
      'INV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
      s.id,s.customer_id,v_start,v_end,'issued',now()+interval '15 days',
      v_subtotal,v_discount,v_tax,v_total,0,auth.uid()
    ) returning id into v_invoice;

    for li in select * from public.subscription_lines where subscription_id=s.id loop
      v_base:=round(li.quantity*li.unit_price,2);
      v_net:=v_base-li.discount_amount;
      v_line_tax:=round(v_net*li.tax_rate/100,2);
      insert into public.invoice_lines (
        invoice_id,product_id,description,quantity,unit_price,discount_amount,
        tax_rate,tax_amount,line_total
      ) values (
        v_invoice,li.product_id,li.description,li.quantity,li.unit_price,
        li.discount_amount,li.tax_rate,v_line_tax,v_net+v_line_tax
      );
    end loop;
    update public.subscriptions
       set next_billing_date=v_end,current_period_start=v_start,current_period_end=v_end
     where id=s.id;
    v_ids:=v_ids||to_jsonb(v_invoice::text);
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('processed',v_count,'created_invoice_ids',v_ids,'skipped',v_skipped);
end;
$$;

revoke all on function public.run_due_billing(date) from public;
revoke all on function public.run_due_billing(date) from anon;
grant execute on function public.run_due_billing(date) to authenticated;
