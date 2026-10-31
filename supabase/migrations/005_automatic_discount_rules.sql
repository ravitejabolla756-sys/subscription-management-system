-- SubFlow 005: rule-driven discounts in recurring invoices.
-- Requires 001 -> 002 -> 003 -> 004. Apply once, then run the hosted
-- billing regression tests BEFORE merging the app feature.
--
-- Policy: at most one automatic rule per invoice (the greatest eligible
-- monetary benefit, breaking ties by UUID). A product-scoped rule discounts
-- only that product's lines; an unscoped rule discounts the entire invoice.
-- Existing per-line discounts are preserved and promotion is applied to the
-- remaining pre-tax amount. The rule redemption count increments once per
-- successfully created invoice, in the same transaction.

alter table public.discount_rules
  add column if not exists minimum_spend numeric(12,2) not null default 0,
  add column if not exists minimum_quantity numeric(12,3) not null default 0,
  add column if not exists product_id uuid references public.products(id) on delete restrict;

alter table public.discount_rules
  add constraint discount_rules_minimum_spend_nonnegative check (minimum_spend >= 0),
  add constraint discount_rules_minimum_quantity_nonnegative check (minimum_quantity >= 0),
  add constraint discount_rules_redemption_limit_valid check (
    max_redemptions is null or redemption_count <= max_redemptions
  );

alter table public.invoices
  add column if not exists discount_rule_id uuid references public.discount_rules(id) on delete set null;

create index if not exists discount_rules_product_eligibility_idx
  on public.discount_rules(product_id, is_active, valid_from, valid_until);

-- This replaces only the function body; the existing function signature,
-- admin permission check and result envelope remain unchanged.
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
  v_original_net numeric(12,2);
  v_net numeric(12,2);
  v_line_discount numeric(12,2);
  v_line_tax numeric(12,2);
  v_promo_alloc numeric(12,2);
  v_rule_id uuid;
  v_rule_type public.discount_type;
  v_rule_value numeric(12,2);
  v_rule_product_id uuid;
  v_eligible_subtotal numeric(12,2);
  v_eligible_remaining numeric(12,2);
  v_promo_discount numeric(12,2);
  v_promo_remaining numeric(12,2);
  v_lines jsonb;
  v_count integer := 0;
  v_skipped integer := 0;
  v_ids jsonb := '[]'::jsonb;
begin
  if auth.uid() is null
     or (select public.current_app_role()) is distinct from 'admin'::public.app_role then
    raise exception 'Only an admin can run billing' using errcode = '42501';
  end if;
  if p_as_of > (now() at time zone 'UTC')::date then
    raise exception 'Future billing dates are not permitted' using errcode = '22023';
  end if;

  for s in
    select sub.id, sub.customer_id, sub.next_billing_date, sub.plan_id,
           p.billing_interval, p.interval_count
      from public.subscriptions sub
      join public.plans p on p.id = sub.plan_id
     where sub.status = 'active'
       and sub.next_billing_date <= p_as_of
     order by sub.next_billing_date, sub.id
     for update of sub skip locked
     limit 250
  loop
    v_start := s.next_billing_date;
    v_end := case s.billing_interval
      when 'daily' then v_start + s.interval_count
      when 'weekly' then v_start + (7 * s.interval_count)
      when 'monthly' then (v_start + make_interval(months => s.interval_count))::date
      when 'yearly' then (v_start + make_interval(years => s.interval_count))::date
    end;

    if v_end is null or v_end <= v_start then
      raise exception 'Invalid billing interval for subscription %', s.id;
    end if;

    if exists (
      select 1 from public.invoices
       where subscription_id = s.id and billing_period_start = v_start
    ) then
      update public.subscriptions
         set next_billing_date = v_end,
             current_period_start = v_start,
             current_period_end = v_end
       where id = s.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if not exists (
      select 1 from public.subscription_lines where subscription_id = s.id
    ) then
      raise exception 'Subscription % has no billable lines', s.id;
    end if;

    -- Choose and lock one eligible rule, to serialize usage-limit checks.
    -- A zero-benefit rule is never redeemed.
    v_rule_id := null;
    v_rule_type := null;
    v_rule_value := null;
    v_rule_product_id := null;
    v_eligible_subtotal := 0;

    select dr.id, dr.discount_type, dr.value, dr.product_id,
           eligible.subtotal
      into v_rule_id, v_rule_type, v_rule_value, v_rule_product_id,
           v_eligible_subtotal
      from public.discount_rules dr
      cross join lateral (
        select coalesce(sum(greatest(
                   0::numeric,
                   round(sl.quantity * sl.unit_price, 2) - sl.discount_amount
               )), 0)::numeric(12,2) as subtotal,
               coalesce(sum(sl.quantity), 0)::numeric(12,3) as qty
          from public.subscription_lines sl
         where sl.subscription_id = s.id
           and (dr.product_id is null or sl.product_id = dr.product_id)
      ) eligible
     where dr.is_active
       and (dr.valid_from is null or dr.valid_from <= v_start)
       and (dr.valid_until is null or dr.valid_until >= v_start)
       and (dr.max_redemptions is null or dr.redemption_count < dr.max_redemptions)
       and eligible.subtotal > 0
       and eligible.subtotal >= dr.minimum_spend
       and eligible.qty >= dr.minimum_quantity
       and dr.value > 0
     order by
       case dr.discount_type
         when 'percentage' then least(eligible.subtotal, round(eligible.subtotal * dr.value / 100, 2))
         else least(eligible.subtotal, dr.value)
       end desc, dr.id
     limit 1
     for update of dr;

    v_promo_discount := 0;
    if v_rule_id is not null then
      v_promo_discount := least(
        v_eligible_subtotal,
        case v_rule_type
          when 'percentage' then round(v_eligible_subtotal * v_rule_value / 100, 2)
          else v_rule_value
        end
      );
    end if;
    if v_promo_discount <= 0 then
      v_rule_id := null;
      v_rule_product_id := null;
      v_promo_discount := 0;
    end if;

    v_promo_remaining := v_promo_discount;
    v_eligible_remaining := coalesce(v_eligible_subtotal, 0);
    v_lines := '[]'::jsonb;
    v_subtotal := 0;
    v_discount := 0;
    v_tax := 0;

    -- Stable order makes cent allocation deterministic. The final eligible
    -- line receives remaining cents, so header totals match line totals.
    for li in
      select * from public.subscription_lines
       where subscription_id = s.id
       order by id
    loop
      v_base := round(li.quantity * li.unit_price, 2);
      v_original_net := greatest(0::numeric, v_base - li.discount_amount);
      v_promo_alloc := 0;

      if v_rule_id is not null
         and (v_rule_product_id is null or li.product_id = v_rule_product_id)
         and v_original_net > 0 then
        if v_eligible_remaining <= v_original_net then
          v_promo_alloc := least(v_promo_remaining, v_original_net);
        else
          v_promo_alloc := least(
            v_promo_remaining,
            v_original_net,
            round(v_promo_discount * v_original_net / v_eligible_subtotal, 2)
          );
        end if;
        v_promo_remaining := v_promo_remaining - v_promo_alloc;
        v_eligible_remaining := greatest(0::numeric, v_eligible_remaining - v_original_net);
      end if;

      v_line_discount := li.discount_amount + v_promo_alloc;
      v_net := greatest(0::numeric, v_base - v_line_discount);
      v_line_tax := round(v_net * li.tax_rate / 100, 2);
      v_subtotal := v_subtotal + v_base;
      v_discount := v_discount + v_line_discount;
      v_tax := v_tax + v_line_tax;

      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'product_id', li.product_id,
        'description', li.description,
        'quantity', li.quantity,
        'unit_price', li.unit_price,
        'discount_amount', v_line_discount,
        'tax_rate', li.tax_rate,
        'tax_amount', v_line_tax,
        'line_total', v_net + v_line_tax
      ));
    end loop;

    v_total := v_subtotal - v_discount + v_tax;

    insert into public.invoices (
      invoice_number, subscription_id, customer_id,
      billing_period_start, billing_period_end, status, due_at,
      subtotal_amount, discount_amount, tax_amount, total_amount,
      paid_amount, created_by, discount_rule_id
    ) values (
      'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      s.id, s.customer_id, v_start, v_end, 'issued', now() + interval '15 days',
      v_subtotal, v_discount, v_tax, v_total, 0, auth.uid(), v_rule_id
    ) returning id into v_invoice;

    insert into public.invoice_lines (
      invoice_id, product_id, description, quantity, unit_price,
      discount_amount, tax_rate, tax_amount, line_total
    )
    select v_invoice, x.product_id, x.description, x.quantity, x.unit_price,
           x.discount_amount, x.tax_rate, x.tax_amount, x.line_total
      from jsonb_to_recordset(v_lines) as x(
        product_id uuid, description text, quantity numeric(12,3),
        unit_price numeric(12,2), discount_amount numeric(12,2),
        tax_rate numeric(5,2), tax_amount numeric(12,2),
        line_total numeric(12,2)
      );

    if v_rule_id is not null then
      update public.discount_rules
         set redemption_count = redemption_count + 1
       where id = v_rule_id;
    end if;

    update public.subscriptions
       set next_billing_date = v_end,
           current_period_start = v_start,
           current_period_end = v_end
     where id = s.id;

    v_ids := v_ids || to_jsonb(v_invoice::text);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'processed', v_count,
    'created_invoice_ids', v_ids,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.run_due_billing(date) from public;
revoke all on function public.run_due_billing(date) from anon;
grant execute on function public.run_due_billing(date) to authenticated;
