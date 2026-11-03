import { useMemo, useState } from 'react'
import { Download, Handshake, Layers, Package, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useSales } from '../hooks/useSales'
import { useStockMovements } from '../hooks/useStockMovements'
import { downloadCSV } from '../lib/csv'
import { formatBRL } from '../lib/format'
import { normalize } from '../lib/normalize'
import {
  PERIODS,
  SALE_KINDS,
  dailySeries,
  dayLabel,
  groupByDay,
  hasNoCost,
  monthEnd,
  monthLabel,
  periodRange,
  saleCost,
  saleProfit,
  saleTitle,
  shortDate,
  summarize,
  todayISO,
} from '../lib/sales'
import RegisterSaleModal from '../components/RegisterSaleModal'
import SalesChart from '../components/SalesChart'

const KIND_ICONS = { product: Package, service: Layers, commission: Handshake }

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export default function Vendas() {
  const { sales, loading, error, missingSetup, registerSale, deleteSale } = useSales()
  const { products, refetch: refetchProducts } = useProducts()
  const { movements } = useStockMovements()
  const [period, setPeriod] = useState('month')
  const [search, setSearch] = useState('')
  const [registerKind, setRegisterKind] = useState(null)
  const [actionError, setActionError] = useState('')

  const today = todayISO()
  const { from, to } = periodRange(period, today)
  const periodLabel = PERIODS.find((p) => p.key === period).label.toLowerCase()

  const summary = useMemo(() => summarize(sales, today), [sales, today])
  const periodSales = useMemo(() => sales.filter((s) => s.sold_at >= from && s.sold_at <= to), [sales, from, to])
  // No gráfico, "Este mês" mostra o mês inteiro (dias futuros vazios) para ver a barra subindo.
  const chartTo = period === 'month' ? monthEnd(today) : to
  const series = useMemo(() => dailySeries(sales, from, chartTo), [sales, from, chartTo])
  const periodTotal = series.reduce((sum, d) => sum + d.amount, 0)
  const bestDay = series.reduce((best, d) => (d.amount > best.amount ? d : best), { amount: 0 })

  const filtered = useMemo(() => {
    const term = normalize(search)
    if (!term) return periodSales
    return periodSales.filter((s) =>
      normalize(`${s.description} ${s.channel ?? ''} ${s.account ?? ''} ${String(s.amount).replace('.', ',')}`).includes(term)
    )
  }, [periodSales, search])
  const groups = useMemo(() => groupByDay(filtered), [filtered])

  const accounts = useMemo(
    () => [...new Set([...sales.map((s) => s.account).filter(Boolean), 'Banco · pessoal', 'Banco · empresa', 'Dinheiro'])],
    [sales]
  )

  const month = summary.month
  const marginPct = month.amount > 0 ? Math.round((month.profit / month.amount) * 100) : 0
  const costSalesInMonth = summary.costSales
  const costedSales = costSalesInMonth - month.withoutCost
  const oldMovements = useMemo(() => movements.filter((m) => !m.sale_id).slice(0, 200), [movements])

  async function handleRegister(payload) {
    await registerSale(payload)
    await refetchProducts()
  }

  async function handleDelete(sale) {
    const returned = sale.quantity === 1 ? 'A unidade volta' : `As ${sale.quantity} unidades voltam`
    const note = sale.kind === 'product' ? `\n\n${returned} para o estoque.` : ''
    if (!confirm(`Desfazer esta venda?\n${saleTitle(sale)}${note}`)) return
    setActionError('')
    try {
      await deleteSale(sale.id)
      await refetchProducts()
    } catch (err) {
      setActionError(err.message)
    }
  }

  function handleExportCSV() {
    const headers = ['Data', 'Tipo', 'Descrição', 'Quantidade', 'Recebido', 'Desconto', 'Custo', 'Sobrou', 'Canal', 'Conta']
    const rows = filtered.map((s) => [
      s.sold_at.split('-').reverse().join('/'),
      SALE_KINDS[s.kind].label,
      s.description,
      s.quantity,
      s.amount,
      s.discount,
      saleCost(s),
      saleProfit(s),
      s.channel || '',
      s.account || '',
    ])
    downloadCSV(`vendas-${from}_a_${to}.csv`, headers, rows)
  }

  if (loading) return <p className="text-gray-400">Carregando vendas...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Vendas</h1>
          <p className="mt-1 text-sm text-gray-400">Faturamento, o que sobrou e o que você vendeu.</p>
        </div>
        {!missingSetup && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        )}
      </div>

      {missingSetup && (
        <div className="flex gap-3 rounded-2xl border border-gold-600/50 bg-gold-500/10 p-4 text-sm text-gold-400">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Falta uma etapa no banco</p>
            <p className="mt-1 text-gray-300">
              Rode o arquivo <code className="text-gold-400">supabase/vendas.sql</code> no SQL Editor do Supabase
              (uma vez só) e recarregue esta página. Ele cria o registro de vendas com valor, desconto e custo.
            </p>
          </div>
        </div>
      )}

      {!missingSetup && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
              <p className="text-sm text-gray-400">Vendeu hoje</p>
              <p className="mt-1 text-3xl font-bold text-green-400">{formatBRL(summary.today.amount)}</p>
              <p className="mt-2 text-sm text-gray-400">
                em {plural(summary.today.count, 'venda', 'vendas')} · ontem{' '}
                <b className="text-gray-200">{formatBRL(summary.yesterday.amount)}</b> · {monthLabel(today).split(' ')[0]}{' '}
                <b className="text-gray-200">{formatBRL(month.amount)}</b> em {plural(month.count, 'venda', 'vendas')}
              </p>
            </div>

            <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
              <p className="text-sm text-gray-400">Sobrou no mês</p>
              <p className="mt-1 text-3xl font-bold text-green-400">{formatBRL(month.profit)}</p>
              <p className="mt-2 text-sm text-gray-400">
                {marginPct}% do faturamento, depois do custo dos produtos.
              </p>
              {costSalesInMonth > 0 && (
                <p className={`mt-1 text-xs ${month.withoutCost > 0 ? 'text-gold-500' : 'text-gray-500'}`}>
                  custos <b>{formatBRL(month.cost)}</b> · {costedSales} de {costSalesInMonth}{' '}
                  {costSalesInMonth === 1 ? 'venda' : 'vendas'} com custo informado
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
            <h2 className="font-semibold text-gray-100">Registrar venda</h2>
            <p className="text-sm text-gray-400">Produtos físicos também dão baixa no estoque.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Object.entries(SALE_KINDS).map(([key, { label }]) => {
                const Icon = KIND_ICONS[key]
                return (
                  <button
                    key={key}
                    onClick={() => setRegisterKind(key)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-navy-600 px-4 py-3 text-sm font-semibold text-gray-100 hover:border-gold-500 hover:bg-navy-800"
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-100">Faturamento por dia</h2>
                <p className="text-sm text-gray-400">
                  <b className="text-gray-200">{formatBRL(periodTotal)}</b> em {periodSales.length}{' '}
                  {periodSales.length === 1 ? 'venda' : 'vendas'} · {periodLabel}
                </p>
              </div>
              <div className="flex gap-1 rounded-xl bg-navy-800 p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                      period === p.key ? 'bg-gold-500 text-navy-950' : 'text-gray-300 hover:bg-navy-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {bestDay.amount > 0 && (
              <p className="mt-3 text-right text-xs font-semibold text-green-400">
                melhor dia · {formatBRL(bestDay.amount)} ({shortDate(bestDay.date)})
              </p>
            )}
            <div className="mt-1">
              <SalesChart data={series} todayDate={today} />
            </div>
            <p className="mt-1 text-xs text-gray-500">Toque ou passe o mouse sobre um dia para ver o valor.</p>
          </div>

          <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-100">Vendas · {periodLabel}</h2>
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="item, conta, canal ou valor"
                  className="w-full rounded-lg border border-navy-600 bg-navy-800 py-2 pl-9 pr-3 text-sm text-gray-100 outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}

            {groups.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {search ? 'Nenhuma venda encontrada.' : 'Nenhuma venda neste período.'}
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {groups.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-baseline justify-between border-b border-navy-700 pb-1 text-sm">
                      <span className="font-semibold text-gray-300">{dayLabel(group.date, today)}</span>
                      <span className="font-semibold text-gray-300">{formatBRL(group.total)}</span>
                    </div>
                    <ul className="divide-y divide-navy-700">
                      {group.sales.map((sale) => {
                        const Icon = KIND_ICONS[sale.kind]
                        const details = [
                          sale.account,
                          sale.kind === 'product' ? `${sale.quantity} un` : null,
                          Number(sale.discount) > 0 ? `desconto ${formatBRL(sale.discount)}` : null,
                        ].filter(Boolean)
                        return (
                          <li key={sale.id} className="flex items-center gap-3 py-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navy-800 text-gray-300">
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-100">{saleTitle(sale)}</p>
                              {details.length > 0 && <p className="text-xs text-gray-500">{details.join(' · ')}</p>}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-bold text-green-400">+ {formatBRL(sale.amount)}</p>
                              {hasNoCost(sale) ? (
                                <p className="text-xs text-gold-500">
                                  {sale.kind === 'service' ? 'sem custo informado' : 'sem custo cadastrado'}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  sobrou <b className="text-green-400">{formatBRL(saleProfit(sale))}</b>
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDelete(sale)}
                              title="Desfazer esta venda"
                              className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-navy-700 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {oldMovements.length > 0 && (
        <details className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-gray-300">
            Histórico de baixas de estoque (sem valor, não entra no faturamento)
          </summary>
          <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-navy-700">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-navy-950 text-gray-400">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Qtd.</th>
                  <th className="px-3 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {oldMovements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-gray-300">{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-gray-100">{m.products?.name ?? '-'}</td>
                    <td className={`px-3 py-2 font-semibold ${m.quantity_change < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {m.quantity_change}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{m.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {registerKind && (
        <RegisterSaleModal
          products={products}
          accounts={accounts}
          initialKind={registerKind}
          onClose={() => setRegisterKind(null)}
          onSubmit={handleRegister}
        />
      )}
    </div>
  )
}
