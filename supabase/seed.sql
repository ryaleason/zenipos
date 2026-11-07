-- ZeniPOS Seed Data
-- File: supabase/seed.sql
-- Description: Seed initial admin user and sample active & expired UMKM for testing

-- Enable pgcrypto for password hashing
create extension if not exists "pgcrypto";

-- ==========================================
-- 1. SEED AUTH USERS
-- ==========================================

-- 1.1 Admin User: admin@zenipos.id (password: Admin12345!)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@zenipos.id',
  crypt('Admin12345!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin ZeniPOS"}'::jsonb,
  now(),
  now()
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email = excluded.email;

-- 1.2 Owner User (Active UMKM): budi@kopi-berkah.id (password: Budi12345!)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111101',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'budi@kopi-berkah.id',
  crypt('Budi12345!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Budi Santoso"}'::jsonb,
  now(),
  now()
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email = excluded.email;

-- 1.3 Cashier User (Active UMKM): kasir@kopi-berkah.id (password: Kasir12345!)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111102',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'kasir@kopi-berkah.id',
  crypt('Kasir12345!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Siti Rahma"}'::jsonb,
  now(),
  now()
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email = excluded.email;

-- 1.4 Owner User (Expired UMKM): salim@madura-barokah.id (password: Salim12345!)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '22222222-2222-2222-2222-222222222201',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'salim@madura-barokah.id',
  crypt('Salim12345!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Haji Salim"}'::jsonb,
  now(),
  now()
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email = excluded.email;


-- ==========================================
-- 2. SEED UMKM
-- ==========================================

-- 2.1 Active UMKM: Warung Kopi Berkah (3 months subscription)
insert into public.umkm (
  id,
  name,
  owner_name,
  phone,
  address,
  status,
  active_until
) values (
  '11111111-1111-1111-1111-111111111111',
  'Warung Kopi Berkah',
  'Budi Santoso',
  '081234567890',
  'Jl. Merdeka No. 10, Jakarta Selatan',
  'active',
  current_date + interval '3 months'
) on conflict (id) do update set
  name = excluded.name,
  owner_name = excluded.owner_name,
  phone = excluded.phone,
  status = excluded.status,
  active_until = excluded.active_until;

-- 2.2 Expired UMKM: Toko Kelontong Madura Barokah (Expired 10 days ago)
insert into public.umkm (
  id,
  name,
  owner_name,
  phone,
  address,
  status,
  active_until
) values (
  '22222222-2222-2222-2222-222222222222',
  'Toko Kelontong Madura Barokah',
  'Haji Salim',
  '089876543210',
  'Jl. Kebon Jeruk No. 45, Jakarta Barat',
  'active',
  current_date - interval '10 days'
) on conflict (id) do update set
  name = excluded.name,
  owner_name = excluded.owner_name,
  phone = excluded.phone,
  status = excluded.status,
  active_until = excluded.active_until;


-- ==========================================
-- 3. SEED PROFILES
-- ==========================================

-- 3.1 Admin Profile
insert into public.profiles (
  id,
  umkm_id,
  role,
  full_name,
  must_change_password,
  is_active
) values (
  '00000000-0000-0000-0000-000000000001',
  null,
  'admin',
  'Admin ZeniPOS',
  false,
  true
) on conflict (id) do update set
  full_name = excluded.full_name,
  must_change_password = excluded.must_change_password;

-- 3.2 Owner Profile (Active UMKM)
insert into public.profiles (
  id,
  umkm_id,
  role,
  full_name,
  must_change_password,
  is_active
) values (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111111',
  'owner',
  'Budi Santoso',
  true,
  true
) on conflict (id) do update set
  full_name = excluded.full_name,
  must_change_password = excluded.must_change_password;

-- 3.3 Cashier Profile (Active UMKM)
insert into public.profiles (
  id,
  umkm_id,
  role,
  full_name,
  must_change_password,
  is_active
) values (
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111111',
  'cashier',
  'Siti Rahma',
  true,
  true
) on conflict (id) do update set
  full_name = excluded.full_name,
  must_change_password = excluded.must_change_password;

-- 3.4 Owner Profile (Expired UMKM)
insert into public.profiles (
  id,
  umkm_id,
  role,
  full_name,
  must_change_password,
  is_active
) values (
  '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222222',
  'owner',
  'Haji Salim',
  false,
  true
) on conflict (id) do update set
  full_name = excluded.full_name,
  must_change_password = excluded.must_change_password;


-- ==========================================
-- 4. SEED SAMPLE CATEGORIES & PRODUCTS (Active UMKM)
-- ==========================================

-- Categories
insert into public.categories (id, umkm_id, name)
values
  ('11111111-1111-1111-1111-200000000001', '11111111-1111-1111-1111-111111111111', 'Minuman'),
  ('11111111-1111-1111-1111-200000000002', '11111111-1111-1111-1111-111111111111', 'Makanan')
on conflict (id) do nothing;

-- Products
insert into public.products (
  id,
  umkm_id,
  category_id,
  name,
  sku,
  barcode,
  sell_price,
  cost_price,
  unit,
  track_stock,
  min_stock,
  is_active
) values
  (
    '11111111-1111-1111-1111-300000000001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-200000000001',
    'Kopi Susu Aren',
    'MNM-001',
    '8991001001',
    18000,
    8000,
    'cup',
    true,
    10,
    true
  ),
  (
    '11111111-1111-1111-1111-300000000002',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-200000000001',
    'Es Teh Manis',
    'MNM-002',
    '8991001002',
    5000,
    1500,
    'cup',
    true,
    10,
    true
  ),
  (
    '11111111-1111-1111-1111-300000000003',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-200000000002',
    'Roti Bakar Cokelat Keju',
    'MKN-001',
    '8991001003',
    15000,
    6500,
    'porsi',
    true,
    5,
    true
  )
on conflict (id) do nothing;

-- Initial Stock Movements
insert into public.stock_movements (
  id,
  umkm_id,
  product_id,
  type,
  qty,
  note,
  created_by
) values
  (
    '11111111-1111-1111-1111-400000000001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-300000000001',
    'initial',
    100,
    'Stok awal sistem',
    '11111111-1111-1111-1111-111111111101'
  ),
  (
    '11111111-1111-1111-1111-400000000002',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-300000000002',
    'initial',
    100,
    'Stok awal sistem',
    '11111111-1111-1111-1111-111111111101'
  ),
  (
    '11111111-1111-1111-1111-400000000003',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-300000000003',
    'initial',
    50,
    'Stok awal sistem',
    '11111111-1111-1111-1111-111111111101'
  )
on conflict (id) do nothing;
