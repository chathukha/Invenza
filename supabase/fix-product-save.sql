begin;

create sequence if not exists public.product_code_seq start with 1;

create or replace function public.next_product_code()
returns text
language sql
security definer
set search_path = public
as $$
  select lpad(nextval('public.product_code_seq')::text, 8, '0');
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_sku_8_digits'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products drop constraint products_sku_8_digits;
  end if;
end;
$$;

drop index if exists public.products_sku_unique_active;

update public.products
set sku = 'TMP-' || products.id::text;

with ordered_products as (
  select id, row_number() over (order by created_at, id) as product_no
  from public.products
)
update public.products
set sku = lpad(ordered_products.product_no::text, 8, '0')
from ordered_products
where products.id = ordered_products.id;

select setval(
  'public.product_code_seq',
  greatest(
    coalesce((select max(sku::integer) from public.products where sku ~ '^[0-9]{8}$'), 0) + 1,
    1
  ),
  false
);

alter table public.products
alter column sku set default public.next_product_code();

create unique index products_sku_unique_active
on public.products (lower(sku))
where is_active;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_sku_8_digits'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_sku_8_digits check (sku ~ '^[0-9]{8}$');
  end if;
end;
$$;

commit;

-- If products still do not save after running this, make sure your user is admin:
-- update public.profiles
-- set role = 'admin', full_name = 'Owner'
-- where email = 'your-email@example.com';
