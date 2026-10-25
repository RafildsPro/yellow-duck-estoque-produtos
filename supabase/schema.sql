-- Yellow Duck TCG — schema do estoque
-- Rode este script inteiro no SQL Editor do Supabase (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  quantity integer not null default 0 check (quantity >= 0),
  cost_price numeric(10, 2) not null default 0,
  sale_price numeric(10, 2) not null default 0,
  condition text,
  entry_date date not null default current_date,
  photo_url text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_name_idx on public.products (name);

-- histórico de saídas/entradas manuais de estoque
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_change integer not null, -- negativo = saída, positivo = entrada
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- mantém updated_at em dia
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- RLS: só usuário autenticado lê e altera.
-- Em um banco que estava com acesso liberado, use supabase/trancar_acesso.sql.
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "public full access" on public.products;
drop policy if exists "authenticated full access" on public.products;
create policy "authenticated full access" on public.products
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "public full access" on public.stock_movements;
drop policy if exists "authenticated full access" on public.stock_movements;
create policy "authenticated full access" on public.stock_movements
  for all
  to authenticated
  using (true)
  with check (true);

-- Storage: bucket público para fotos dos produtos
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read product photos" on storage.objects;
create policy "public read product photos" on storage.objects
  for select
  to public
  using (bucket_id = 'product-photos');

drop policy if exists "public upload product photos" on storage.objects;
drop policy if exists "authenticated upload product photos" on storage.objects;
create policy "authenticated upload product photos" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "public update product photos" on storage.objects;
drop policy if exists "authenticated update product photos" on storage.objects;
create policy "authenticated update product photos" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-photos');

drop policy if exists "public delete product photos" on storage.objects;
drop policy if exists "authenticated delete product photos" on storage.objects;
create policy "authenticated delete product photos" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-photos');
