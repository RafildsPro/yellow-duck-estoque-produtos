// Classificação dos produtos a partir do nome, no padrão já usado no estoque:
// "(PT-BR) Caixa de Booster - Megaevolução 4 - Caos Ascendente".

const LANGUAGES = {
  'PT-BR': { code: 'br', label: 'PT-BR' },
  'PT-BTR': { code: 'br', label: 'PT-BR' },
  ING: { code: 'us', label: 'ING' },
  JAP: { code: 'jp', label: 'JAP' },
  CHN: { code: 'cn', label: 'CHN' },
}

// Ordem das seções do cardápio.
export const SECTIONS = [
  { key: 'caixa-booster', title: 'Caixas de Booster' },
  { key: 'combo', title: 'Combos de Pacotes' },
  { key: 'colecao-treinador', title: 'Coleções Treinador Avançado' },
  { key: 'single', title: 'Blisters Unitários' },
  { key: 'blister-triplo', title: 'Blisters Triplos' },
  { key: 'blister-quadruplo', title: 'Blisters Quádruplos' },
  { key: 'box', title: 'Boxes' },
  { key: 'mini-tin', title: 'Mini Latas' },
  { key: 'lorcana', title: 'Lorcana' },
  { key: 'outros', title: 'Outros' },
]

// Prefixos do início do nome (sem o idioma) e a seção de cada um. O primeiro que casar vale.
const SECTION_PREFIXES = [
  ['Caixa de Booster', 'caixa-booster'],
  ['Combo de Pacotes', 'combo'],
  ['Coleção Treinador', 'colecao-treinador'],
  ['Blister Unitário', 'single'],
  ['Blister Triplo', 'blister-triplo'],
  ['Blister Quádruplo', 'blister-quadruplo'],
  ['Box', 'box'],
  ['Coleção Ilustração', 'box'],
  ['Mini Lata', 'mini-tin'],
]

export function normalizeName(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// "(ING) Caixa de Booster - X" -> { language, rest: "Caixa de Booster - X" }
export function splitLanguage(name) {
  const match = String(name ?? '').match(/^\(([^)]+)\)\s*(.*)$/)
  if (!match) return { language: null, rest: String(name ?? '').trim() }
  const language = LANGUAGES[match[1].trim().toUpperCase()] ?? null
  return { language, rest: language ? match[2].trim() : String(name).trim() }
}

// A categoria "Lorcana" vale mais que o nome: os kits e decks de Lorcana não seguem o padrão dos Pokémon.
export function sectionKeyOf(name, category = '') {
  if (normalizeName(category) === 'lorcana') return 'lorcana'
  const { rest } = splitLanguage(name)
  const normalized = normalizeName(rest)
  for (const [prefix, key] of SECTION_PREFIXES) {
    const p = normalizeName(prefix)
    // "Box" não pode casar com "Boxer"; exige fim do texto ou separador depois do prefixo.
    if (normalized === p || normalized.startsWith(p + ' ') || normalized.startsWith(p + '-')) return key
  }
  return 'outros'
}

// Nome para exibir ao cliente: sem o prefixo de idioma.
export function displayName(name) {
  return splitLanguage(name).rest
}

export function groupBySection(products) {
  const groups = new Map(SECTIONS.map((s) => [s.key, []]))
  for (const p of products) groups.get(sectionKeyOf(p.name, p.category)).push(p)
  return SECTIONS.map((section) => ({ ...section, items: groups.get(section.key) })).filter(
    (g) => g.items.length > 0
  )
}
