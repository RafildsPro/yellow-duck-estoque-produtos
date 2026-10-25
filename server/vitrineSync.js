// Calcula como a Vitrine (RafildsPro/yellow-vitrine) deve ficar a partir do estoque.
// Só lógica: não lê nem grava nada. Quem lê o estoque e grava no GitHub é api/publish.js.
//
// Regras:
// - Só entra na Vitrine o produto marcado como "visible" ou "presale" (o padrão é "hidden").
// - O item da Vitrine é achado pelo nome. O que está na Vitrine e não tem produto igual no
//   estoque NÃO é mexido (nem removido), do jeito que está.
// - Marcar como "hidden" um produto que já está na Vitrine tira o item de lá.
// - Visível que zera vira "esgotado". Pré-venda nunca é esgotado e aparece mesmo sem estoque.
// - Campos feitos à mão na Vitrine (novidade, ultimo, fotos escolhidas) são preservados.
import { SECTIONS, normalizeName, sectionKeyOf, splitLanguage } from '../src/lib/catalog.js'

export const VITRINE_KEYS = SECTIONS.map((s) => s.key)
const SECTION_TITLE = Object.fromEntries(SECTIONS.map((s) => [s.key, s.title]))

export const filePathOf = (key) => `produtos/${key}.json`

const brl = (value) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`
const isAbsoluteUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value)

function tokensOf(name) {
  return new Set(
    normalizeName(splitLanguage(name).rest)
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean)
  )
}

// "Mini Lata - 151" e "(ING) Mini Lata - 151 - UNIDADE" provavelmente são o mesmo produto.
function looksLikeSameProduct(a, b) {
  const ta = tokensOf(a)
  const tb = tokensOf(b)
  if (ta.size < 2 || tb.size < 2) return false
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta]
  return [...small].every((t) => big.has(t))
}

function fallbackEdition(product) {
  if (product.category) return product.category
  const parts = splitLanguage(product.name).rest.split(' - ')
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'Outros'
}

function parseFiles(files) {
  const parsed = {}
  for (const key of VITRINE_KEYS) {
    const text = files[key] ?? null
    const data = text ? JSON.parse(text) : { items: [] }
    parsed[key] = {
      key,
      text,
      data,
      endsWithNewline: text ? /\n$/.test(text) : false,
      original: JSON.stringify(data.items ?? []),
      items: (data.items ?? []).map((item) => ({ ...item })),
    }
  }
  return parsed
}

function indexByName(parsed) {
  const index = new Map()
  for (const file of Object.values(parsed)) {
    file.items.forEach((item) => {
      const name = normalizeName(item.nome)
      if (!index.has(name)) index.set(name, [])
      index.get(name).push({ file, item })
    })
  }
  return index
}

/**
 * @param {Array<{id: string, name: string, category?: string, quantity: number, sale_price: number, photo_url?: string, store_status?: string}>} products
 *   Em ordem do mais novo para o mais antigo (os novos entram no topo da Vitrine nessa ordem).
 * @param {Record<string, string|null>} files Texto atual de cada produtos/<chave>.json.
 */
export function computeSync(products, files) {
  const parsed = parseFiles(files)
  const byName = indexByName(parsed)
  const claimedItems = new Set()
  const seenNames = new Set()
  const removed = new Set()
  const created = Object.fromEntries(VITRINE_KEYS.map((k) => [k, []]))
  const changes = []
  let eligible = 0

  for (const product of products) {
    const status = product.store_status || 'hidden'
    const normalized = normalizeName(product.name)

    // Dois produtos com o mesmo nome virariam dois cartões iguais; só o primeiro vale.
    if (seenNames.has(normalized)) {
      if (status !== 'hidden') {
        changes.push({ kind: 'ignorado', nome: product.name, detalhe: 'Outro produto do estoque tem exatamente o mesmo nome.' })
      }
      continue
    }
    seenNames.add(normalized)

    const match = (byName.get(normalized) ?? []).find((m) => !claimedItems.has(m.item))
    if (match) claimedItems.add(match.item)

    if (status === 'hidden') {
      if (match) {
        removed.add(match.item)
        changes.push({ kind: 'saiu', nome: match.item.nome, detalhe: 'Marcado como Oculto no estoque.' })
      }
      continue
    }

    eligible++

    if (!(product.sale_price > 0)) {
      changes.push({ kind: 'ignorado', nome: product.name, detalhe: 'Sem preço de venda.' })
      continue
    }

    const presale = status === 'presale'
    const soldOut = !presale && product.quantity === 0

    if (match) {
      const { item } = match
      const notes = []

      if (item.preco !== product.sale_price) {
        notes.push(`preço ${brl(item.preco)} → ${brl(product.sale_price)}`)
        item.preco = product.sale_price
      }

      const wasSoldOut = item.esgotado === true
      if (soldOut !== wasSoldOut) {
        notes.push(soldOut ? 'esgotou' : 'voltou ao estoque')
        if (soldOut) item.esgotado = true
        else item.esgotado = false
      }

      const wasPresale = item.prevenda === true
      if (presale !== wasPresale) {
        notes.push(presale ? 'entrou em pré-venda' : 'saiu da pré-venda')
        if (presale) item.prevenda = true
        else item.prevenda = false
      }

      const hasImage = Boolean(item.imagens?.length || item.imagem)
      if (product.photo_url && (!hasImage || (isAbsoluteUrl(item.imagem) && item.imagem !== product.photo_url))) {
        item.imagem = product.photo_url
        notes.push(hasImage ? 'foto atualizada' : 'foto adicionada')
      }

      if (notes.length) changes.push({ kind: 'atualizado', nome: item.nome, detalhe: notes.join(', ') })
      continue
    }

    // Produto novo na Vitrine.
    if (soldOut) {
      changes.push({ kind: 'ignorado', nome: product.name, detalhe: 'Sem estoque e ainda não estava na Vitrine.' })
      continue
    }

    const { language } = splitLanguage(product.name)
    const key = sectionKeyOf(product.name)
    const item = { nome: product.name, edicao: fallbackEdition(product) }
    if (language) item.lingua = language.code
    item.preco = product.sale_price
    if (product.photo_url) item.imagem = product.photo_url
    if (presale) item.prevenda = true
    created[key].push(item)
    changes.push({
      kind: 'novo',
      nome: product.name,
      detalhe: `${SECTION_TITLE[key]} · ${brl(product.sale_price)}${presale ? ' · pré-venda' : ''}`,
      _item: item,
    })
  }

  // Itens que só existem na Vitrine ficam como estão. Avisa se algum novo parece ser o mesmo.
  const vitrineOnly = []
  for (const file of Object.values(parsed)) {
    for (const item of file.items) {
      if (!claimedItems.has(item)) vitrineOnly.push(item)
    }
  }
  for (const change of changes) {
    if (change.kind !== 'novo') continue
    const twin = vitrineOnly.find((item) => looksLikeSameProduct(item.nome, change.nome))
    if (twin) change.possivelDuplicata = twin.nome
    delete change._item
  }

  // Monta os arquivos e só devolve os que realmente mudaram.
  const changedFiles = []
  for (const file of Object.values(parsed)) {
    const items = [...created[file.key], ...file.items.filter((item) => !removed.has(item))]
    if (JSON.stringify(items) === file.original) continue
    const text =
      JSON.stringify({ ...file.data, items }, null, 2) + (file.endsWithNewline || !file.text ? '\n' : '')
    changedFiles.push({ key: file.key, path: filePathOf(file.key), text })
  }

  const count = (kind) => changes.filter((c) => c.kind === kind).length
  return {
    files: changedFiles,
    changes,
    vitrineOnly: vitrineOnly.map((item) => item.nome),
    summary: {
      naVitrine: eligible,
      novos: count('novo'),
      atualizados: count('atualizado'),
      saem: count('saiu'),
      ignorados: count('ignorado'),
      soNaVitrine: vitrineOnly.length,
      arquivosAlterados: changedFiles.length,
    },
  }
}

/**
 * Status inicial dos produtos: quem já está na Vitrine (mesmo nome) começa visível
 * (ou pré-venda, se o item já era pré-venda); o resto começa oculto.
 */
export function initialStatuses(products, files) {
  const parsed = parseFiles(files)
  const byName = indexByName(parsed)
  const claimed = new Set()
  const visible = []
  const presale = []
  for (const product of products) {
    const match = (byName.get(normalizeName(product.name)) ?? []).find((m) => !claimed.has(m.item))
    if (!match) continue
    claimed.add(match.item)
    ;(match.item.prevenda === true ? presale : visible).push({ id: product.id, name: product.name })
  }
  return { visible, presale }
}
