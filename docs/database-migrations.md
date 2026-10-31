# Hosted Supabase migration procedure

The migration files are intentionally ordered lexically:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_auth_and_rls.sql`
3. `supabase/migrations/003_billing_engine.sql`
4. `supabase/migrations/004_subscription_creation.sql`

Migration 001 creates the enum types, tables, indexes, timestamps, invoice
uniqueness constraint, and payment trigger. Migration 002 depends on those
objects and creates the Auth profile trigger, role helpers, bootstrap procedure,
grants, RLS enablement, and policies. Migration 003 creates the atomic recurring
billing function. Migration 004 creates the atomic subscription-plus-pricing
snapshot function.

## Apply through SQL Editor

Do not run a migration more than once on the same database. In PowerShell, copy
the first file to the clipboard:

```powershell
Set-Location C:\subscription-management-system
Get-Content .\supabase\migrations\001_initial_schema.sql -Raw | Set-Clipboard
```

Open the hosted Supabase project, select **SQL Editor**, create a new query,
paste the clipboard contents, and run it. Repeat the same operation for each
remaining migration in numeric order:

```powershell
Get-Content .\supabase\migrations\002_auth_and_rls.sql -Raw | Set-Clipboard
Get-Content .\supabase\migrations\003_billing_engine.sql -Raw | Set-Clipboard
Get-Content .\supabase\migrations\004_subscription_creation.sql -Raw | Set-Clipboard
```

The migration files have not been applied by this review.

## Promote the first Admin safely

1. Register the first user through the normal application/Auth flow.
2. In Supabase **Authentication → Users**, copy that user’s UUID.
3. In SQL Editor, run this once, replacing only the UUID:

```sql
call public.bootstrap_first_admin('00000000-0000-0000-0000-000000000000');
```

The procedure succeeds only when no Admin exists, the Auth user exists, and the
target profile is still `customer`. It uses a transaction advisory lock to
prevent concurrent bootstrap attempts. It has no `PUBLIC`, `anon`, or
`authenticated` execute privilege, so normal users cannot call it through
PostgREST or assign themselves Admin/Staff.

Verify the result in SQL Editor:

```sql
select p.id, u.email, p.role
from public.profiles as p
join auth.users as u on u.id = p.id
where p.role = 'admin';
```

## Verify the migration

Check that all expected tables have RLS enabled:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'customers', 'products', 'plans', 'subscriptions',
    'subscription_lines', 'invoices', 'invoice_lines', 'payments',
    'discount_rules'
  )
order by tablename;
```

Every row must have `rowsecurity = true`.

Check policies and role grants:

```sql
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles', 'customers', 'products', 'plans', 'subscriptions',
    'subscription_lines', 'invoices', 'invoice_lines', 'payments',
    'discount_rules'
  )
order by table_name, grantee, privilege_type;
```

Confirm the duplicate-invoice constraint:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.invoices'::regclass
  and conname = 'invoices_period_unique';
```

The definition must contain `UNIQUE (subscription_id, billing_period_start)`.
