-- Yellow Duck TCG — controle do que vai para a Vitrine
-- Rode UMA vez no SQL Editor do Supabase (Project > SQL Editor > New query).
--
-- Cada produto passa a ter um status da Vitrine:
--   hidden  = Oculto (padrão: não vai para a Vitrine)
--   visible = Visível
--   presale = Pré-venda (aparece com a etiqueta de pré-venda, mesmo sem estoque)

alter table public.products
  add column if not exists store_status text not null default 'hidden'
  check (store_status in ('hidden', 'visible', 'presale'));

-- Status inicial: os produtos que JÁ estão na Vitrine hoje (mesmo nome) começam como Visível.
-- Todo o resto começa Oculto e só vai para a Vitrine quando você marcar.
update public.products
set store_status = 'visible'
where store_status = 'hidden' and id in (
  '25c867a0-a35b-4b8b-b01e-26aa32878d05', -- (PT-BR) Blister Unitário - Megaevolução 5 - Escuridão Absoluta
  '5794664f-e5f7-438b-9570-de1b9dd1e425', -- (PT-BR) Baralho Pré Construído - Baralho Batalha de Liga - Mewtwo ex da Equipe Rocket
  'e5e11cc1-c1eb-4f28-8e27-063082c603e0', -- (PT-BR) Box Coleção - Escarlate e Violeta - Bellibolt Ex da Kissera
  '5796db32-46c2-4fd5-9296-ff783ac5e5ef', -- (PT-BR) Box Coleção de Torneios Lílian
  '47d4003d-3c8c-4505-bb92-a9fb42d360b4', -- (PT-BR) Box Coleção - Mega Charizard Y
  'c937d451-2e25-47dc-920c-7dd63831acfc', -- (PT-BR) Box Coleção - Mega Charizard X
  '9c62d997-947b-4589-9896-995529f64ac2', -- (PT-BR) Box Coleção - Dia de Pokémon 2026
  '58ad59f1-0699-444b-857d-b1de355f44f3', -- (ING) Box Ultra Premium - Mega Charizard X ex
  'f5084273-638a-48ab-bb8d-e34c60e9576a', -- (PT-BR) Blister Quádruplo Escarlate e Violeta 8.5 - Evoluções Prismáticas
  '3d822190-cea0-414f-a824-06d45ddd868a', -- (PT-BR) Blister Quádruplo Megaevolução 1 - Megaevolução
  '4f50bbff-d64d-4e9a-962a-588f8bd71a05', -- (PT-BR) Blister Quádruplo Megaevolução 2 - Fogo Fantasmagórico
  'dc29ffd0-3d68-41a6-afa7-45e2a1fa279b', -- (PT-BR) Blister Quádruplo Megaevolução 4 - Caos Ascendente
  '73e9b8ed-f468-4db9-923b-6713d1ca429b', -- (ING) Box Coleção Especial - Accessory Pouch Evoluções Prismáticas
  '6af8a575-e51f-4e8d-a5f8-3f21f383374b', -- (PT-BR) Blister Quádruplo Megaevolução 5 - Escuridão Absoluta
  '6fe98d6b-65cb-4fea-af3d-ebaa8455f503', -- (PT-BR) Blister Triplo Espada e Escudo 13 - Realeza Absoluta
  '390c04c5-332c-404e-8ed1-87802d1fa2db', -- (PT-BR) Blister Triplo Escarlate e Violeta 8.5 - Evoluções Prismáticas
  '7e57e7bc-3673-4013-8bac-a50c88c5630d', -- (PT-BR) Blister Triplo Escarlate e Violeta 10 - Rivais Predestinados
  'e5358506-c1b7-4fe5-9315-f89042749432', -- (PT-BR) Blister Triplo Megaevolução 1 - Megaevolução
  'a070ebe5-1365-416c-a31f-08f087dff899', -- (PT-BR) Blister Triplo Megaevolução 2 - Fogo Fantasmagórico
  '2a2b05ce-4e56-4242-aa8b-ae56e58536c7', -- (PT-BR) Blister Triplo Megaevolução 3 - Equilíbrio Perfeito
  '4c55afd7-1c44-43f2-acc7-9066a374d2a4', -- (PT-BR) Blister Triplo Megaevolução 4 - Caos Ascendente
  '634566e1-1d28-40db-b0d2-5c0fada6f925', -- (ING) Blister Triplo Megaevolução 5 - Escuridão Absoluta
  'e8ce4b8c-9a8a-404f-926a-da44c42aa68b', -- (PT-BR) Blister Triplo Megaevolução 5 - Escuridão Absoluta
  '4ffd3db4-1e9a-40d1-95fe-0819c1fca5f3', -- (PT-BR) Blister Unitário - Escarlate e Violeta 8 - Fagulhas Impetuosas
  '1d1f1da4-a86e-4f7b-836c-0e19677f9f7b', -- (PT-BR) Blister Unitário - Escarlate e Violeta 9 - Amigos de Jornada
  '17f84f28-798f-4be1-ac9b-ddc1efe539c8', -- (PT-BR) Blister Unitário - Escarlate e Violeta 10 - Rivais Predestinados
  '7b196fae-9912-423a-ba3e-d26e51a1a42a', -- (PT-BR) Blister Unitário - Megaevolução 1 - Megaevolução
  '415edf1c-6809-4415-8f5e-71f0780cfd95', -- (PT-BR) Blister Unitário - Megaevolução 2 - Fogo Fantasmagórico
  '26208596-6977-49ec-9ba2-bda57ce27cc1', -- (PT-BR) Blister Unitário - Megaevolução 3 - Equilíbrio Perfeito
  '77366d96-b229-42a4-a18e-8cdb6572b3cd', -- (PT-BR) Blister Unitário - Megaevolução 4 - Caos Ascendente
  'b8ddda7b-28b0-496a-a5bf-448f7f42e5e0', -- (ING) Blister Unitário - Megaevolução 5 - Escuridão Absoluta
  'c0d7313f-30c7-4b12-b3d3-c9d80039a710', -- (ING) Coleção Treinador Avançado - Megaevolução 2 - Fogo Fantasmagórico
  '1d23d7fe-5887-4a4d-a00f-fa405b308af0', -- (PT-BR) Coleção Treinador Avançado - Megaevolução 2 - Fogo Fantasmagórico
  'f09edd45-ca58-4fba-9130-2dffaa36888d', -- (ING) Coleção Treinador Avançado - Megaevolução 2.5 - Heróis Excelsos
  'b58ae750-f7bc-444e-aa3c-fe692959ffa8', -- (ING) Coleção Treinador Avançado - Megaevolução 3 - Equilíbrio Perfeito
  '8746e06f-c2e9-4517-b52c-b47843019dba', -- (ING) Coleção Treinador Avançado - Megaevolução 5 - Escuridão Absoluta
  '4c6a4341-eccc-4064-98c9-ebf895103313', -- (PT-BR) Coleção Treinador Avançado - Megaevolução 5 - Escuridão Absoluta
  '1f80ecba-3cbe-4817-9ffd-03718c72b988', -- (PT-BR) Combo de Pacotes - Escarlate e Violeta 8.5 - Evoluções Prismáticas
  '80ae46cb-1cb9-46cb-b36e-a8e98957db85', -- (ING) Combo de Pacotes - Megaevolução 5 - Escuridão Absoluta
  '4adb4112-b065-41ae-a9a0-c283f940c312', -- (PT-BR) Combo de Pacotes - Escarlate e Violeta 10.5 - Fogo Branco
  '296080c9-29b2-4446-9f17-067a49b50f38', -- (PT-BR) Combo de Pacotes - Megaevolução 1 - Megaevolução
  '0f69c75f-5dc3-42da-97d9-fbab3c46aeb2', -- (PT-BR) Combo de Pacotes - Megaevolução 4 - Caos Ascendente
  '2a598a8d-8ac0-429a-a235-0c02771682c2', -- (PT-BR) Combo de Pacotes - Megaevolução 5 - Escuridão Absoluta
  '7fb72b6a-521c-4520-8d64-625466262038', -- (PT-BR) Combo de Pacotes - Megaevolução 2.5 - Heróis Excelsos
  '2d88df2a-38bb-4ed3-9310-220363f249fc', -- (CHN) Caixa de Booster - GEM Pack Vol.3
  'ab76594f-2583-43cb-9c98-92ceb38e737f', -- (PT-BR) Caixa de Booster - Espada e Escudo 10 - Estrelas Radiantes
  '5ae37229-2af8-4b55-ad66-ac44bdf7ada1', -- (PT-BR) Caixa de Booster - Escarlate e Violeta 3 - Obsidiana em Chamas
  'ab548401-1a76-40b5-99ee-7ca1db476f47', -- (PT-BR) Caixa de Booster - Escarlate e Violeta 10 - Rivais Predestinados
  '2d7a069c-6f08-44b4-bf0e-6e1d6d57b81a', -- (PT-BR) Caixa de Booster - Megaevolução 1 - Megaevolução
  'b9435628-3014-41b9-99d8-5d0fbefadaeb', -- (PT-BR) Caixa de Booster - Megaevolução 2 - Fogo Fantasmagórico
  'e4c28cb0-99fa-43e8-b1cf-8ea35f0f4f4c', -- (PT-BR) Caixa de Booster - Megaevolução 3 - Equilíbrio Perfeito
  '95ce1763-78b4-4951-b729-09236c0259b9', -- (PT-BR) Caixa de Booster - Megaevolução 4 - Caos Ascendente
  '83b866fb-c651-4e46-8232-8fa62901fdec' -- (PT-BR) Caixa de Booster - Megaevolução 5 - Escuridão Absoluta
);

notify pgrst, 'reload schema';
