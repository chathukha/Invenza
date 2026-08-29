create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'cashier');
create type public.inventory_movement_type as enum ('opening', 'grn', 'prn', 'sale', 'adjustment');
create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'qr');
create type public.sale_status as enum ('completed', 'cancelled');

create sequence if not exists public.product_code_seq start with 1;

create or replace function public.next_product_code()
returns text
language sql
security definer
set search_path = public
as $$
  select lpad(nextval('public.product_code_seq')::text, 8, '0');
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'cashier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  id boolean primary key default true,
  store_name text not null default 'TouchPOS Store',
  store_phone text,
  store_address text,
  currency text not null default 'LKR',
  receipt_footer text not null default 'Thank you. Please come again.',
  default_tax_rate numeric(8, 3) not null default 0,
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton check (id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0f766e',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_name_unique_active on public.categories (lower(name)) where is_active;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers(lower(name));
create index customers_phone_idx on public.customers(phone);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_name_idx on public.suppliers(lower(name));
create index suppliers_phone_idx on public.suppliers(phone);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  sku text not null default public.next_product_code(),
  barcode text,
  image_url text,
  cost_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null,
  current_stock numeric(12, 3) not null default 0,
  low_stock_level numeric(12, 3) not null default 5,
  tax_rate numeric(8, 3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_selling_price_nonnegative check (selling_price >= 0),
  constraint products_cost_price_nonnegative check (cost_price >= 0),
  constraint products_sku_8_digits check (sku ~ '^[0-9]{8}$')
);

create unique index products_sku_unique_active on public.products (lower(sku)) where is_active;
create index products_category_idx on public.products(category_id);
create index products_supplier_idx on public.products(supplier_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique,
  cashier_id uuid not null references public.profiles(id),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  subtotal numeric(12, 2) not null default 0,
  line_discount_total numeric(12, 2) not null default 0,
  bill_discount_type text not null default 'amount',
  bill_discount_value numeric(12, 2) not null default 0,
  bill_discount_total numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status public.sale_status not null default 'completed',
  note text,
  created_at timestamptz not null default now(),
  constraint sales_bill_discount_type_check check (bill_discount_type in ('amount', 'percent'))
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  sku text not null,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  line_subtotal numeric(12, 2) not null,
  line_discount_type text not null default 'amount',
  line_discount_value numeric(12, 2) not null default 0,
  line_discount numeric(12, 2) not null default 0,
  tax_rate numeric(8, 3) not null default 0,
  line_tax numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint sale_items_line_discount_type_check check (line_discount_type in ('amount', 'percent'))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  method public.payment_method not null,
  amount numeric(12, 2) not null,
  change_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index sales_customer_idx on public.sales(customer_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  supplier_id uuid references public.suppliers(id) on delete set null,
  movement_type public.inventory_movement_type not null,
  quantity_delta numeric(12, 3) not null,
  stock_after numeric(12, 3) not null,
  document_no text,
  reference_type text,
  reference_id uuid,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index inventory_movements_product_idx on public.inventory_movements(product_id);
create index inventory_movements_supplier_idx on public.inventory_movements(supplier_id);

create sequence public.sale_receipt_seq start 1;
create sequence public.inventory_doc_seq start 1;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'cashier'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.next_receipt_no()
returns text
language sql
as $$
  select 'POS-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.sale_receipt_seq')::text, 5, '0');
$$;

create or replace function public.next_inventory_document_no(
  p_document_type public.inventory_movement_type
)
returns text
language sql
as $$
  select upper(p_document_type::text) || '-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.inventory_doc_seq')::text, 5, '0');
$$;

create or replace function public.post_inventory_document(
  p_product_id uuid,
  p_document_type public.inventory_movement_type,
  p_quantity numeric,
  p_supplier_id uuid default null,
  p_document_no text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_delta numeric(12, 3);
  v_new_stock numeric(12, 3);
  v_document_no text;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can post inventory documents';
  end if;

  if p_document_type not in ('grn', 'prn') then
    raise exception 'Document type must be GRN or PRN';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  v_delta := case when p_document_type = 'grn' then p_quantity else -p_quantity end;
  v_new_stock := v_product.current_stock + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock cannot become negative';
  end if;

  v_document_no := coalesce(nullif(trim(p_document_no), ''), public.next_inventory_document_no(p_document_type));

  update public.products
  set current_stock = v_new_stock,
      supplier_id = coalesce(p_supplier_id, supplier_id)
  where id = p_product_id;

  insert into public.inventory_movements (
    product_id,
    supplier_id,
    movement_type,
    quantity_delta,
    stock_after,
    document_no,
    reference_type,
    reason,
    created_by
  )
  values (
    p_product_id,
    p_supplier_id,
    p_document_type,
    v_delta,
    v_new_stock,
    v_document_no,
    p_document_type::text,
    p_reason,
    auth.uid()
  );

  return jsonb_build_object(
    'product_id', p_product_id,
    'document_type', p_document_type,
    'document_no', v_document_no,
    'quantity_delta', v_delta,
    'stock_after', v_new_stock
  );
end;
$$;

create or replace function public.complete_sale(
  p_items jsonb,
  p_payments jsonb,
  p_discount_total numeric default 0,
  p_bill_discount_type text default 'amount',
  p_bill_discount_value numeric default 0,
  p_customer_name text default null,
  p_customer_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_receipt_no text;
  v_item jsonb;
  v_payment jsonb;
  v_payment_index integer;
  v_payment_count integer;
  v_product public.products%rowtype;
  v_qty numeric(12, 3);
  v_line_subtotal numeric(12, 2);
  v_line_discount_type text;
  v_line_discount_value numeric(12, 2);
  v_line_discount numeric(12, 2);
  v_line_net numeric(12, 2);
  v_line_tax numeric(12, 2);
  v_line_total numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_line_discount_total numeric(12, 2) := 0;
  v_tax_total numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_payment_amount numeric(12, 2);
  v_payment_method public.payment_method;
  v_payment_total numeric(12, 2) := 0;
  v_stock_after numeric(12, 3);
  v_change numeric(12, 2);
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale must include at least one item';
  end if;

  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'Sale must include at least one payment';
  end if;

  p_discount_total := coalesce(p_discount_total, 0);
  p_bill_discount_type := coalesce(nullif(p_bill_discount_type, ''), 'amount');
  p_bill_discount_value := greatest(coalesce(p_bill_discount_value, 0), 0);

  if p_discount_total < 0 then
    raise exception 'Discount cannot be negative';
  end if;

  if p_bill_discount_type not in ('amount', 'percent') then
    raise exception 'Bill discount type must be amount or percent';
  end if;

  v_receipt_no := public.next_receipt_no();

  insert into public.sales (
    receipt_no,
    cashier_id,
    customer_id,
    customer_name,
    subtotal,
    line_discount_total,
    bill_discount_type,
    bill_discount_value,
    bill_discount_total,
    discount_total,
    tax_total,
    total,
    note
  )
  values (
    v_receipt_no,
    auth.uid(),
    p_customer_id,
    p_customer_name,
    0,
    0,
    coalesce(p_bill_discount_type, 'amount'),
    coalesce(p_bill_discount_value, 0),
    p_discount_total,
    p_discount_total,
    0,
    0,
    p_note
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::numeric, 0);

    if v_qty <= 0 then
      raise exception 'Item quantity must be greater than zero';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and is_active = true
    for update;

    if not found then
      raise exception 'Product not found or inactive';
    end if;

    if v_product.current_stock < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_line_subtotal := round((v_qty * v_product.selling_price)::numeric, 2);
    v_line_discount_type := coalesce(nullif(v_item->>'discount_type', ''), 'amount');
    v_line_discount_value := greatest(coalesce(nullif(v_item->>'discount_value', '')::numeric, 0), 0);

    if v_line_discount_type not in ('amount', 'percent') then
      raise exception 'Line discount type must be amount or percent';
    end if;

    v_line_discount := case
      when v_line_discount_type = 'percent' then round((v_line_subtotal * least(v_line_discount_value, 100) / 100)::numeric, 2)
      else round(least(v_line_discount_value, v_line_subtotal)::numeric, 2)
    end;
    v_line_net := v_line_subtotal - v_line_discount;
    v_line_tax := round((v_line_net * v_product.tax_rate / 100)::numeric, 2);
    v_line_total := v_line_net + v_line_tax;
    v_subtotal := v_subtotal + v_line_subtotal;
    v_line_discount_total := v_line_discount_total + v_line_discount;
    v_tax_total := v_tax_total + v_line_tax;
    v_stock_after := v_product.current_stock - v_qty;

    insert into public.sale_items (
      sale_id,
      product_id,
      product_name,
      sku,
      quantity,
      unit_price,
      line_subtotal,
      line_discount_type,
      line_discount_value,
      line_discount,
      tax_rate,
      line_tax,
      line_total
    )
    values (
      v_sale_id,
      v_product.id,
      v_product.name,
      v_product.sku,
      v_qty,
      v_product.selling_price,
      v_line_subtotal,
      v_line_discount_type,
      v_line_discount_value,
      v_line_discount,
      v_product.tax_rate,
      v_line_tax,
      v_line_total
    );

    update public.products
    set current_stock = v_stock_after
    where id = v_product.id;

    insert into public.inventory_movements (
      product_id,
      supplier_id,
      movement_type,
      quantity_delta,
      stock_after,
      document_no,
      reference_type,
      reference_id,
      reason,
      created_by
    )
    values (
      v_product.id,
      v_product.supplier_id,
      'sale',
      -v_qty,
      v_stock_after,
      v_receipt_no,
      'sale',
      v_sale_id,
      'POS sale',
      auth.uid()
    );
  end loop;

  if p_discount_total > (v_subtotal - v_line_discount_total) then
    raise exception 'Discount cannot be greater than subtotal';
  end if;

  v_total := round(v_subtotal - v_line_discount_total + v_tax_total - p_discount_total, 2);

  v_payment_count := jsonb_array_length(p_payments);

  for v_payment, v_payment_index in
    select value, ordinality::int
    from jsonb_array_elements(p_payments) with ordinality as payment(value, ordinality)
  loop
    v_payment_method := (v_payment->>'method')::public.payment_method;
    v_payment_amount := round(coalesce(nullif(v_payment->>'amount', '')::numeric, 0), 2);

    if v_payment_amount <= 0 then
      raise exception 'Payment amount must be greater than zero';
    end if;

    v_payment_total := v_payment_total + v_payment_amount;
  end loop;

  if v_payment_total < v_total then
    raise exception 'Paid amount is less than total';
  end if;

  v_change := round(v_payment_total - v_total, 2);

  update public.sales
  set subtotal = v_subtotal,
      line_discount_total = v_line_discount_total,
      bill_discount_type = coalesce(p_bill_discount_type, 'amount'),
      bill_discount_value = coalesce(p_bill_discount_value, 0),
      bill_discount_total = p_discount_total,
      discount_total = v_line_discount_total + p_discount_total,
      tax_total = v_tax_total,
      total = v_total
  where id = v_sale_id;

  for v_payment, v_payment_index in
    select value, ordinality::int
    from jsonb_array_elements(p_payments) with ordinality as payment(value, ordinality)
  loop
    v_payment_method := (v_payment->>'method')::public.payment_method;
    v_payment_amount := round(coalesce(nullif(v_payment->>'amount', '')::numeric, 0), 2);

    insert into public.payments (
      sale_id,
      method,
      amount,
      change_amount
    )
    values (
      v_sale_id,
      v_payment_method,
      v_payment_amount,
      case when v_payment_index = v_payment_count then v_change else 0 end
    );
  end loop;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'receipt_no', v_receipt_no,
    'customer_name', p_customer_name,
    'subtotal', v_subtotal,
    'line_discount_total', v_line_discount_total,
    'bill_discount_total', p_discount_total,
    'discount_total', v_line_discount_total + p_discount_total,
    'tax_total', v_tax_total,
    'total', v_total,
    'payments', p_payments,
    'amount_paid', v_payment_total,
    'change_amount', v_change
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_movements enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "settings_select_authenticated"
on public.store_settings for select
to authenticated
using (true);

create policy "settings_update_admin"
on public.store_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "categories_select_authenticated"
on public.categories for select
to authenticated
using (true);

create policy "categories_write_admin"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "customers_select_authenticated"
on public.customers for select
to authenticated
using (true);

create policy "customers_write_admin"
on public.customers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "suppliers_select_authenticated"
on public.suppliers for select
to authenticated
using (true);

create policy "suppliers_write_admin"
on public.suppliers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "products_select_authenticated"
on public.products for select
to authenticated
using (true);

create policy "products_write_admin"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "sales_select_own_or_admin"
on public.sales for select
to authenticated
using (cashier_id = auth.uid() or public.is_admin());

create policy "sale_items_select_own_or_admin"
on public.sale_items for select
to authenticated
using (
  exists (
    select 1 from public.sales
    where sales.id = sale_items.sale_id
      and (sales.cashier_id = auth.uid() or public.is_admin())
  )
);

create policy "payments_select_own_or_admin"
on public.payments for select
to authenticated
using (
  exists (
    select 1 from public.sales
    where sales.id = payments.sale_id
      and (sales.cashier_id = auth.uid() or public.is_admin())
  )
);

create policy "inventory_movements_select_authenticated"
on public.inventory_movements for select
to authenticated
using (true);

create policy "inventory_movements_insert_admin"
on public.inventory_movements for insert
to authenticated
with check (public.is_admin());

create or replace view public.all_transactions
with (security_invoker = true)
as
select
  sales.id as transaction_id,
  'sale'::text as transaction_type,
  sales.created_at as occurred_at,
  sales.receipt_no as reference_no,
  coalesce(customers.name, sales.customer_name, 'Walk-in customer') as party_name,
  null::text as product_name,
  null::numeric(12, 3) as quantity_delta,
  null::numeric(12, 3) as stock_after,
  sales.total as amount,
  sales.status::text as details
from public.sales
left join public.customers on customers.id = sales.customer_id
union all
select
  payments.id as transaction_id,
  'payment'::text as transaction_type,
  payments.created_at as occurred_at,
  sales.receipt_no as reference_no,
  coalesce(customers.name, sales.customer_name, 'Walk-in customer') as party_name,
  null::text as product_name,
  null::numeric(12, 3) as quantity_delta,
  null::numeric(12, 3) as stock_after,
  payments.amount as amount,
  payments.method::text as details
from public.payments
left join public.sales on sales.id = payments.sale_id
left join public.customers on customers.id = sales.customer_id
union all
select
  inventory_movements.id as transaction_id,
  'inventory'::text as transaction_type,
  inventory_movements.created_at as occurred_at,
  coalesce(inventory_movements.document_no, inventory_movements.reference_type) as reference_no,
  suppliers.name as party_name,
  products.name as product_name,
  inventory_movements.quantity_delta,
  inventory_movements.stock_after,
  null::numeric(12, 2) as amount,
  concat_ws(' - ', inventory_movements.movement_type::text, inventory_movements.reason) as details
from public.inventory_movements
left join public.products on products.id = inventory_movements.product_id
left join public.suppliers on suppliers.id = inventory_movements.supplier_id;

grant select on public.all_transactions to authenticated;
grant execute on function public.complete_sale(jsonb, jsonb, numeric, text, numeric, text, uuid, text) to authenticated;
grant execute on function public.post_inventory_document(uuid, public.inventory_movement_type, numeric, uuid, text, text) to authenticated;

insert into public.store_settings (id)
values (true)
on conflict (id) do nothing;

insert into public.categories (name, color, sort_order)
values
  ('Beverages', '#0f766e', 1),
  ('Snacks', '#b45309', 2),
  ('Grocery', '#4f46e5', 3),
  ('Essentials', '#be123c', 4)
on conflict do nothing;

insert into public.customers (name, phone, note)
select 'Regular Customer', '0770000000', 'Starter customer'
where not exists (
  select 1 from public.customers where lower(name) = 'regular customer'
);

insert into public.suppliers (name, contact_person, phone, note)
select 'General Supplier', 'Sales Desk', '0110000000', 'Starter supplier'
where not exists (
  select 1 from public.suppliers where lower(name) = 'general supplier'
);

-- Bootstrap your first admin after creating/signing up the first Supabase Auth user:
-- update public.profiles
-- set role = 'admin', full_name = 'Owner'
-- where email = 'your-new-email@example.com';
