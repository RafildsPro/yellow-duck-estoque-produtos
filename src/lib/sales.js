// Contas e datas das vendas. Sem dependência de tela, para dar para testar sozinho.
const TIME_ZONE = 'America/Sao_Paulo'

export const SALE_KINDS = {
  product: { label: 'Produto físico', short: 'Venda' },
  // No banco o tipo continua "service"; na tela é a carta avulsa (fora do estoque).
  service: { label: 'Carta Avulsa', short: 'Carta avulsa' },
  commission: { label: 'Comissão', short: 'Comissão' },
}

export const CHANNELS = ['WhatsApp', 'Presencial', 'Instagram', 'Liga Pokémon', 'Mercado Livre', 'Outro']

export const PERIODS = [
  { key: 'month', label: 'Este mês' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
]

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

// "2026-11-03" no fuso de São Paulo, não no de quem abriu o site.
export function todayISO(now = new Date()) {
  return now.toLocaleDateString('sv-SE', { timeZone: TIME_ZONE })
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export const monthStart = (iso) => `${iso.slice(0, 8)}01`

// Último dia do mês de uma data ("2026-11-03" -> "2026-11-30").
export function monthEnd(iso) {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

export function eachDay(from, to) {
  const days = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

export function periodRange(period, today) {
  if (period === 'month') return { from: monthStart(today), to: today }
  return { from: addDays(today, -(Number(period) - 1)), to: today }
}

// Aceita "1.150,00", "1150,5", "1150.5" e "R$ 1.150,00". Devolve NaN se não for número.
export function parseMoney(text) {
  const clean = String(text ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
  if (clean === '') return NaN
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN
}

// Para preencher um campo de texto: sem separador de milhar, para ficar fácil de editar.
export const moneyToInput = (value) => round2(value).toFixed(2).replace('.', ',')

export const commissionAmount = (base, pct) => round2((Number(base) * Number(pct)) / 100)

// Sugestão do "quanto recebeu" (antes do desconto): preço cadastrado × quantidade.
export const suggestedAmount = (product, quantity) =>
  round2(Number(product.sale_price) * Number(quantity))

// Valor da venda depois do desconto. É o que conta no faturamento.
export const amountAfterDiscount = (gross, discount) => round2(Math.max(0, Number(gross) - Number(discount)))

// O que de fato cai na conta: valor da venda − desconto (− taxa, se um dia for usada).
export const paidIntoAccount = (gross, discount, fee = 0) =>
  round2(Math.max(0, Number(gross) - Number(discount) - Number(fee)))

export const saleCost = (sale) => round2(Number(sale.unit_cost) * Number(sale.quantity))

// O que sobrou: recebido − taxa − custo dos produtos.
export const saleProfit = (sale) => round2(Number(sale.amount) - Number(sale.fee) - saleCost(sale))

// Produto ou carta avulsa com custo 0: sem custo, o "sobrou" dela não é confiável.
export const hasNoCost = (sale) =>
  (sale.kind === 'product' || sale.kind === 'service') && Number(sale.unit_cost) === 0

function totals(sales) {
  let amount = 0
  let profit = 0
  let cost = 0
  let withoutCost = 0
  for (const sale of sales) {
    amount += Number(sale.amount)
    profit += saleProfit(sale)
    cost += saleCost(sale)
    if (hasNoCost(sale)) withoutCost++
  }
  return { amount: round2(amount), profit: round2(profit), cost: round2(cost), count: sales.length, withoutCost }
}

export function summarize(sales, today) {
  const yesterday = addDays(today, -1)
  const start = monthStart(today)
  const inMonth = sales.filter((s) => s.sold_at >= start && s.sold_at <= today)
  const month = totals(inMonth)
  const dayOfMonth = Number(today.slice(8, 10))
  return {
    today: totals(sales.filter((s) => s.sold_at === today)),
    yesterday: totals(sales.filter((s) => s.sold_at === yesterday)),
    month,
    averagePerDay: round2(month.amount / dayOfMonth),
    // vendas em que o custo importa (produto e carta avulsa; comissão não tem custo)
    costSales: inMonth.filter((s) => s.kind === 'product' || s.kind === 'service').length,
  }
}

export function dailySeries(sales, from, to) {
  const byDay = new Map(eachDay(from, to).map((date) => [date, { date, amount: 0, count: 0, profit: 0 }]))
  for (const sale of sales) {
    const day = byDay.get(sale.sold_at)
    if (!day) continue
    day.amount = round2(day.amount + Number(sale.amount))
    day.profit = round2(day.profit + saleProfit(sale))
    day.count++
  }
  return [...byDay.values()]
}

export function groupByDay(sales) {
  const groups = new Map()
  for (const sale of sales) {
    if (!groups.has(sale.sold_at)) groups.set(sale.sold_at, [])
    groups.get(sale.sold_at).push(sale)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({ date, sales: items, total: round2(items.reduce((s, x) => s + Number(x.amount), 0)) }))
}

const parts = (iso, options) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...options })

export function dayLabel(iso, today) {
  const text = parts(iso, { day: 'numeric', month: 'long' })
  if (iso === today) return `Hoje · ${text}`
  if (iso === addDays(today, -1)) return `Ontem · ${text}`
  return text
}

export const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
export const monthLabel = (iso) => parts(iso, { month: 'long', year: 'numeric' })

// "Venda · ETB Reinado Delta ×2 · WhatsApp"
export function saleTitle(sale) {
  const kind = SALE_KINDS[sale.kind].short
  const quantity = sale.kind === 'product' && sale.quantity > 1 ? ` ×${sale.quantity}` : ''
  const channel = sale.channel ? ` · ${sale.channel}` : ''
  return `${kind} · ${sale.description}${quantity}${channel}`
}
