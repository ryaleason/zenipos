-- ZeniPOS Database Schema Migration
-- Migration: 20261107000001_init_schema.sql
-- Description: Core 8 tables, multi-tenant RLS, helper functions, views, partial unique indexes, and create_sale RPC.

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. OPERATIONAL TABLES

-- 2.1 UMKM Table (Multi-tenant Root)
create table if not exists public.umkm (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  phone text not null,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  active_until date not null default (current_date + interval '3 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.2 Profiles Table (1 row per user, tied to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  umkm_id uuid references public.umkm(id) on delete cascade,
  role text not null check (role in ('admin', 'owner', 'cashier')),
  full_name text not null,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_profile_umkm check (
    (role = 'admin' and umkm_id is null) or
    (role in ('owner', 'cashier') and umkm_id is not null)
  )
);

-- Partial unique indexes: 1 owner & 1 cashier per UMKM
create unique index if not exists unique_owner_per_umkm
  on public.profiles (umkm_id)
  where (role = 'owner');

create unique index if not exists unique_cashier_per_umkm
  on public.profiles (umkm_id)
  where (role = 'cashier');

create index if not exists idx_profiles_umkm_id
  on public.profiles (umkm_id);

-- 2.3 Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint unique_category_per_umkm unique (umkm_id, name)
);

create index if not exists idx_categories_umkm_id
  on public.categories (umkm_id);

-- 2.4 Products Table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  sell_price integer not null check (sell_price >= 0),
  cost_price integer not null check (cost_price >= 0),
  unit text not null default 'pcs',
  photo_url text,
  track_stock boolean not null default true,
  min_stock integer not null default 0 check (min_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_umkm_id
  on public.products (umkm_id);

create index if not exists idx_products_category_id
  on public.products (category_id);

-- 2.5 Sales Table (Sales Transactions)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  invoice_no text not null,
  total integer not null check (total >= 0),
  payment_method text not null check (payment_method in ('cash', 'transfer', 'qris')),
  paid_amount integer not null check (paid_amount >= 0),
  status text not null default 'completed' check (status in ('completed', 'void')),
  note text,
  sold_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint unique_invoice_per_umkm unique (umkm_id, invoice_no)
);

create index if not exists idx_sales_umkm_id
  on public.sales (umkm_id);

create index if not exists idx_sales_sold_at
  on public.sales (sold_at desc);

create index if not exists idx_sales_created_by
  on public.sales (created_by);

-- 2.6 Sale Items Table (Snapshot of Items per Sale)
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  qty integer not null check (qty > 0),
  sell_price integer not null check (sell_price >= 0),
  cost_price integer not null check (cost_price >= 0),
  subtotal integer not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_items_sale_id
  on public.sale_items (sale_id);

create index if not exists idx_sale_items_umkm_id
  on public.sale_items (umkm_id);

create index if not exists idx_sale_items_product_id
  on public.sale_items (product_id);

-- 2.7 Stock Movements Table (Inventory Ledger)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete cascade,
  type text not null check (type in ('initial', 'purchase', 'sale', 'sale_void', 'adjustment')),
  qty integer not null check (qty <> 0),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_umkm_id
  on public.stock_movements (umkm_id);

create index if not exists idx_stock_movements_product_id
  on public.stock_movements (product_id);

create index if not exists idx_stock_movements_sale_id
  on public.stock_movements (sale_id);

create index if not exists idx_stock_movements_created_at
  on public.stock_movements (created_at desc);

-- 2.8 Expenses Table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  category text not null,
  amount integer not null check (amount > 0),
  note text,
  spent_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_umkm_id
  on public.expenses (umkm_id);

create index if not exists idx_expenses_spent_at
  on public.expenses (spent_at desc);


-- 3. RLS HELPER FUNCTIONS

create or replace function public.current_umkm_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select umkm_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.umkm_is_active(target_umkm_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_umkm_id uuid := coalesce(target_umkm_id, public.current_umkm_id());
begin
  if v_umkm_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.umkm
    where id = v_umkm_id
      and status = 'active'
      and active_until >= current_date
  );
end;
$$;


-- 4. VIEWS

-- 4.1 Aggregate view for Admin (Privacy safe: no items or customer basket exposed)
create or replace view public.admin_umkm_summary
with (security_barrier = true)
as
select
  u.id as umkm_id,
  u.name as umkm_name,
  u.owner_name,
  u.phone,
  u.address,
  u.status,
  u.active_until,
  (u.active_until < current_date) as is_expired,
  coalesce(p_stat.total_products, 0)::bigint as total_products,
  coalesce(s_stat.total_sales_count, 0)::bigint as total_sales_count,
  coalesce(s_stat.total_sales_amount, 0)::bigint as total_sales_amount,
  u.created_at,
  u.updated_at
from public.umkm u
left join (
  select umkm_id, count(*) as total_products
  from public.products
  where is_active = true
  group by umkm_id
) p_stat on p_stat.umkm_id = u.id
left join (
  select umkm_id, count(*) as total_sales_count, coalesce(sum(total), 0) as total_sales_amount
  from public.sales
  where status = 'completed'
  group by umkm_id
) s_stat on s_stat.umkm_id = u.id
where public.current_role() = 'admin';

-- 4.2 Cashier products view (Hides cost_price, computes real-time stock)
create or replace view public.cashier_products_view
with (security_barrier = true)
as
select
  p.id,
  p.umkm_id,
  p.category_id,
  c.name as category_name,
  p.name,
  p.sku,
  p.barcode,
  p.sell_price,
  p.unit,
  p.photo_url,
  p.track_stock,
  p.min_stock,
  p.is_active,
  coalesce(sum(sm.qty), 0)::integer as current_stock,
  p.created_at,
  p.updated_at
from public.products p
left join public.categories c on c.id = p.category_id
left join public.stock_movements sm on sm.product_id = p.id
where p.umkm_id = public.current_umkm_id()
  and p.is_active = true
group by p.id, c.name;


-- 5. ATOMIC RPC FUNCTION FOR SALES (create_sale)

create or replace function public.create_sale(
  p_id uuid,
  p_invoice_no text,
  p_total integer,
  p_payment_method text,
  p_paid_amount integer,
  p_sold_at timestamptz default now(),
  p_note text default null,
  p_items jsonb default '[]'::jsonb
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_role text;
  v_umkm_id uuid;
  v_sale public.sales;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_prod public.products;
  v_item_name text;
  v_sell_price integer;
  v_cost_price integer;
  v_subtotal integer;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  select role, umkm_id into v_role, v_umkm_id
  from public.profiles
  where id = v_caller_id;

  if v_role not in ('owner', 'cashier') then
    raise exception 'Forbidden: only owner or cashier can create sales';
  end if;

  if v_umkm_id is null then
    raise exception 'Bad Request: user has no registered UMKM';
  end if;

  if not public.umkm_is_active(v_umkm_id) then
    raise exception 'Forbidden: UMKM is inactive or subscription has expired';
  end if;

  -- Idempotency check: if sale already exists, return existing sale
  select * into v_sale from public.sales where id = p_id;
  if v_sale.id is not null then
    return v_sale;
  end if;

  -- 1. Insert Sales Record
  insert into public.sales (
    id,
    umkm_id,
    invoice_no,
    total,
    payment_method,
    paid_amount,
    status,
    note,
    sold_at,
    synced_at,
    created_by
  ) values (
    p_id,
    v_umkm_id,
    p_invoice_no,
    p_total,
    p_payment_method,
    p_paid_amount,
    'completed',
    p_note,
    coalesce(p_sold_at, now()),
    now(),
    v_caller_id
  )
  on conflict (id) do nothing
  returning * into v_sale;

  if v_sale.id is null then
    select * into v_sale from public.sales where id = p_id;
    return v_sale;
  end if;

  -- 2. Insert Sale Items and Stock Movements
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'Bad Request: item quantity must be greater than 0';
    end if;

    select * into v_prod
    from public.products
    where id = v_product_id and umkm_id = v_umkm_id;

    if v_prod.id is null then
      raise exception 'Not Found: product % not found in this UMKM', v_product_id;
    end if;

    v_item_name := coalesce(v_item->>'product_name', v_prod.name);
    v_sell_price := coalesce((v_item->>'sell_price')::integer, v_prod.sell_price);
    -- Golden Rule 4: cost_price is safely copied from products without exposing to cashier
    v_cost_price := coalesce((v_item->>'cost_price')::integer, v_prod.cost_price);
    v_subtotal := coalesce((v_item->>'subtotal')::integer, v_qty * v_sell_price);

    insert into public.sale_items (
      sale_id,
      umkm_id,
      product_id,
      product_name,
      qty,
      sell_price,
      cost_price,
      subtotal
    ) values (
      v_sale.id,
      v_umkm_id,
      v_product_id,
      v_item_name,
      v_qty,
      v_sell_price,
      v_cost_price,
      v_subtotal
    );

    insert into public.stock_movements (
      umkm_id,
      product_id,
      sale_id,
      type,
      qty,
      note,
      created_by
    ) values (
      v_umkm_id,
      v_product_id,
      v_sale.id,
      'sale',
      -abs(v_qty),
      'Penjualan nota ' || p_invoice_no,
      v_caller_id
    );
  end loop;

  return v_sale;
end;
$$;

-- Overload create_sale accepting single JSONB object payload
create or replace function public.create_sale(p_payload jsonb)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_sale(
    p_id => (p_payload->>'id')::uuid,
    p_invoice_no => p_payload->>'invoice_no',
    p_total => (p_payload->>'total')::integer,
    p_payment_method => p_payload->>'payment_method',
    p_paid_amount => (p_payload->>'paid_amount')::integer,
    p_sold_at => coalesce((p_payload->>'sold_at')::timestamptz, now()),
    p_note => p_payload->>'note',
    p_items => coalesce(p_payload->'items', '[]'::jsonb)
  );
end;
$$;


-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS across all 8 tables
alter table public.umkm enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.expenses enable row level security;

-- 6.1 UMKM Policies
create policy "admin_all_umkm"
  on public.umkm
  for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "members_select_own_umkm"
  on public.umkm
  for select
  using (id = public.current_umkm_id());

create policy "owner_update_own_umkm"
  on public.umkm
  for update
  using (id = public.current_umkm_id() and public.current_role() = 'owner')
  with check (id = public.current_umkm_id() and public.current_role() = 'owner');

-- 6.2 Profiles Policies
create policy "admin_all_profiles"
  on public.profiles
  for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "owner_select_profiles"
  on public.profiles
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_cashier"
  on public.profiles
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and role = 'cashier'
  );

create policy "owner_update_cashier"
  on public.profiles
  for update
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and role = 'cashier'
  )
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and role = 'cashier'
  );

create policy "owner_delete_cashier"
  on public.profiles
  for delete
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and role = 'cashier'
  );

create policy "users_select_own_profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "users_update_own_profile"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 6.3 Categories Policies
create policy "owner_select_categories"
  on public.categories
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_categories"
  on public.categories
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_update_categories"
  on public.categories
  for update
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  )
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_delete_categories"
  on public.categories
  for delete
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "cashier_select_categories"
  on public.categories
  for select
  using (public.current_role() = 'cashier' and umkm_id = public.current_umkm_id());

-- 6.4 Products Policies
-- Cashier does NOT have SELECT on products table to prevent exposure of cost_price;
-- Cashier reads through cashier_products_view.
create policy "owner_select_products"
  on public.products
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_products"
  on public.products
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_update_products"
  on public.products
  for update
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  )
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_delete_products"
  on public.products
  for delete
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

-- 6.5 Sales Policies (Transactions cannot be deleted: Golden Rule 6)
create policy "owner_select_sales"
  on public.sales
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_sales"
  on public.sales
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_update_sales"
  on public.sales
  for update
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  )
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "cashier_select_sales"
  on public.sales
  for select
  using (
    public.current_role() = 'cashier'
    and umkm_id = public.current_umkm_id()
    and created_by = auth.uid()
  );

create policy "cashier_insert_sales"
  on public.sales
  for insert
  with check (
    public.current_role() = 'cashier'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
    and created_by = auth.uid()
  );

-- 6.6 Sale Items Policies
create policy "owner_select_sale_items"
  on public.sale_items
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_sale_items"
  on public.sale_items
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "cashier_insert_sale_items"
  on public.sale_items
  for insert
  with check (
    public.current_role() = 'cashier'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

-- 6.7 Stock Movements Policies (Append-only ledger)
create policy "owner_select_stock_movements"
  on public.stock_movements
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_stock_movements"
  on public.stock_movements
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "cashier_select_stock_movements"
  on public.stock_movements
  for select
  using (public.current_role() = 'cashier' and umkm_id = public.current_umkm_id());

create policy "cashier_insert_stock_movements"
  on public.stock_movements
  for insert
  with check (
    public.current_role() = 'cashier'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

-- 6.8 Expenses Policies (Blocked for Cashier and Admin)
create policy "owner_select_expenses"
  on public.expenses
  for select
  using (public.current_role() = 'owner' and umkm_id = public.current_umkm_id());

create policy "owner_insert_expenses"
  on public.expenses
  for insert
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_update_expenses"
  on public.expenses
  for update
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  )
  with check (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

create policy "owner_delete_expenses"
  on public.expenses
  for delete
  using (
    public.current_role() = 'owner'
    and umkm_id = public.current_umkm_id()
    and public.umkm_is_active()
  );

-- 7. GRANT PERMISSIONS
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;
    grant all on all routines in schema public to authenticated;
    grant select on public.admin_umkm_summary to authenticated;
    grant select on public.cashier_products_view to authenticated;
  end if;
end;
$$;
