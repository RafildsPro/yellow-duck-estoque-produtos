-- Yellow Duck TCG — registro de vendas (produto físico, serviço/digital e comissão)
-- Rode UMA vez no SQL Editor do Supabase (Project > SQL Editor > New query).
--
-- Cria a tabela "sales" (uma linha por venda, com o valor e o custo gravados na hora) e duas
-- funções que fazem tudo de uma vez só: registrar a venda e dar baixa no estoque, ou desfazer a
-- venda e devolver ao estoque. Se alguma parte falhar, nada é gravado pela metade.
-- O histórico antigo de baixas (stock_movements) continua como está e não vira faturamento.

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sold_at date not null default current_date,           -- "Quando foi?"
  kind text not null check (kind in ('product', 'service', 'commission')),
  description text not null,                             -- nome do produto na hora da venda, ou o serviço
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0),  -- custo de 1 unidade na hora
  amount numeric(10, 2) not null check (amount >= 0),    -- quanto você recebeu (já com o desconto)
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  fee numeric(10, 2) not null default 0 check (fee >= 0), -- taxa da plataforma
  channel text,                                          -- por onde vendeu
  account text,                                          -- em qual conta caiu
  base_amount numeric(10, 2),                            -- comissão: valor da venda que gerou a comissão
  commission_pct numeric(5, 2),                          -- comissão: porcentagem
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);

-- liga cada baixa de estoque à venda que a gerou
alter table public.stock_movements
  add column if not exists sale_id uuid references public.sales (id) on delete set null;

alter table public.sales enable row level security;

-- Mesmo acesso do resto do sistema hoje (login desativado). Quando o login voltar,
-- supabase/trancar_acesso.sql troca isto para "authenticated". Se o banco JÁ estiver trancado
-- quando você rodar este arquivo, rode o trancar_acesso.sql de novo logo depois.
drop policy if exists "public full access" on public.sales;
create policy "public full access" on public.sales
  for all
  to public
  using (true)
  with check (true);

-- Registra uma venda. Para produto físico, dá baixa no estoque e grava a baixa, tudo junto.
create or replace function public.register_sale(
  p_kind text,
  p_description text default null,
  p_product_id uuid default null,
  p_quantity integer default 1,
  p_amount numeric default 0,
  p_discount numeric default 0,
  p_fee numeric default 0,
  p_channel text default null,
  p_account text default null,
  p_sold_at date default null,
  p_base_amount numeric default null,
  p_commission_pct numeric default null,
  p_unit_cost numeric default null,
  p_notes text default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_quantity integer := coalesce(p_quantity, 1);
  v_amount numeric := coalesce(p_amount, 0);
  v_unit_cost numeric := coalesce(p_unit_cost, 0);
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_sale_id uuid;
begin
  if p_kind not in ('product', 'service', 'commission') then
    raise exception 'Tipo de venda inválido.';
  end if;
  if v_amount < 0 then
    raise exception 'O valor recebido não pode ser negativo.';
  end if;

  if p_kind = 'product' then
    if p_product_id is null then
      raise exception 'Escolha o produto vendido.';
    end if;
    if v_quantity < 1 then
      raise exception 'A quantidade precisa ser de pelo menos 1.';
    end if;

    select * into v_product from public.products where id = p_product_id for update;
    if not found then
      raise exception 'Produto não encontrado.';
    end if;
    if v_product.quantity < v_quantity then
      raise exception 'Só há % unidade(s) de "%" em estoque.', v_product.quantity, v_product.name;
    end if;

    v_description := v_product.name;
    v_unit_cost := v_product.cost_price;
  else
    v_quantity := 1;
    if v_description is null then
      raise exception 'Descreva a venda.';
    end if;
    if v_amount <= 0 then
      raise exception 'Informe o valor recebido.';
    end if;
  end if;

  insert into public.sales (
    sold_at, kind, description, product_id, quantity, unit_cost, amount, discount, fee,
    channel, account, base_amount, commission_pct, notes
  ) values (
    coalesce(p_sold_at, current_date), p_kind, v_description,
    case when p_kind = 'product' then p_product_id end,
    v_quantity, v_unit_cost, v_amount, coalesce(p_discount, 0), coalesce(p_fee, 0),
    nullif(trim(coalesce(p_channel, '')), ''), nullif(trim(coalesce(p_account, '')), ''),
    p_base_amount, p_commission_pct, nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_sale_id;

  if p_kind = 'product' then
    update public.products set quantity = quantity - v_quantity where id = p_product_id;
    insert into public.stock_movements (product_id, quantity_change, reason, sale_id)
    values (
      p_product_id, -v_quantity,
      'Venda' || coalesce(' · ' || nullif(trim(coalesce(p_channel, '')), ''), ''),
      v_sale_id
    );
  end if;

  return v_sale_id;
end;
$$;

-- Desfaz uma venda. Se era produto físico, devolve as unidades ao estoque.
create or replace function public.delete_sale(p_sale_id uuid) returns void
language plpgsql
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if v_sale.kind = 'product' and v_sale.product_id is not null then
    update public.products set quantity = quantity + v_sale.quantity where id = v_sale.product_id;
    insert into public.stock_movements (product_id, quantity_change, reason)
    values (v_sale.product_id, v_sale.quantity, 'Venda desfeita');
  end if;

  delete from public.sales where id = p_sale_id;
end;
$$;

notify pgrst, 'reload schema';
