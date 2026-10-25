-- Yellow Duck TCG — volta a exigir login para mexer no estoque
-- Rode no SQL Editor do Supabase SOMENTE DEPOIS de conseguir entrar no sistema com e-mail e senha.
-- Depois de rodar, quem não estiver logado não lê nem altera produtos, vendas ou fotos.
-- (As fotos continuam abertas para visualização, porque o PDF e a vitrine usam os links delas.)

-- produtos
drop policy if exists "public full access" on public.products;
drop policy if exists "authenticated full access" on public.products;
create policy "authenticated full access" on public.products
  for all
  to authenticated
  using (true)
  with check (true);

-- vendas / movimentações
drop policy if exists "public full access" on public.stock_movements;
drop policy if exists "authenticated full access" on public.stock_movements;
create policy "authenticated full access" on public.stock_movements
  for all
  to authenticated
  using (true)
  with check (true);

-- fotos: enviar, trocar e apagar só logado
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

notify pgrst, 'reload schema';
