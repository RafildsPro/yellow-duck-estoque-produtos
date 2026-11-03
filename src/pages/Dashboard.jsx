import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, PiggyBank, Boxes, AlertTriangle } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useSales } from '../hooks/useSales'
import { formatBRL } from '../lib/format'
import { LOW_STOCK_THRESHOLD } from '../lib/constants'
import { monthLabel, summarize, todayISO } from '../lib/sales'

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon size={18} className={accent ? 'text-gold-500' : 'text-gray-500'} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent ? 'text-gold-500' : 'text-gray-100'}`}>
        {value}
      </p>
    </div>
  )
}

function StockItem({ product, quantityClassName }) {
  return (
    <li className="relative flex items-center justify-between gap-3 rounded-lg bg-navy-900 px-3 py-2 hover:z-10">
      <div className="flex min-w-0 items-center gap-3">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="h-14 w-14 flex-shrink-0 rounded-lg object-cover transition-transform duration-200 hover:scale-[2.5]"
          />
        ) : (
          <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-navy-700" />
        )}
        <span className="truncate">{product.name}</span>
      </div>
      <span className={`flex-shrink-0 ${quantityClassName}`}>{product.quantity} un.</span>
    </li>
  )
}

function SalesCard({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
      <span className="text-sm text-gray-400">{label}</span>
      <p className="mt-1 text-3xl font-bold text-green-400">{value}</p>
      <p className="mt-2 text-sm text-gray-400">{children}</p>
    </div>
  )
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export default function Dashboard() {
  const { products, loading, error } = useProducts()
  const { sales, loading: salesLoading, missingSetup } = useSales()
  const today = todayISO()
  const summary = useMemo(() => summarize(sales, today), [sales, today])

  const totalSaleValue = products.reduce((sum, p) => sum + p.quantity * p.sale_price, 0)
  const totalCostValue = products.reduce((sum, p) => sum + p.quantity * p.cost_price, 0)
  const potentialProfit = totalSaleValue - totalCostValue
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0)
  const zeroStockProducts = products.filter((p) => p.quantity === 0)
  const lowStockProducts = products.filter((p) => p.quantity > 0 && p.quantity < LOW_STOCK_THRESHOLD)

  if (loading) return <p className="text-gray-400">Carregando dashboard...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-100">Dashboard</h1>

      {!salesLoading && !missingSetup && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SalesCard label="Faturamento do mês" value={formatBRL(summary.month.amount)}>
              {plural(summary.month.count, 'venda', 'vendas')} em {monthLabel(today).split(' ')[0]} · média{' '}
              <b className="text-gray-200">{formatBRL(summary.averagePerDay)}</b> por dia
            </SalesCard>
            <SalesCard label="Vendeu hoje" value={formatBRL(summary.today.amount)}>
              em {plural(summary.today.count, 'venda', 'vendas')} · ontem{' '}
              <b className="text-gray-200">{formatBRL(summary.yesterday.amount)}</b>
            </SalesCard>
          </div>
          <div className="text-right">
            <Link to="/vendas" className="text-sm text-gold-500 hover:text-gold-400">
              Ver vendas →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Valor total em estoque" value={formatBRL(totalSaleValue)} accent />
        <StatCard icon={PiggyBank} label="Valor total investido" value={formatBRL(totalCostValue)} />
        <StatCard icon={TrendingUp} label="Lucro potencial estimado" value={formatBRL(potentialProfit)} accent />
        <StatCard icon={Boxes} label="Itens em estoque" value={totalItems} />
      </div>

      {zeroStockProducts.length > 0 && (
        <div className="rounded-2xl border border-red-700/50 bg-red-900/10 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertTriangle size={16} />
            Sem estoque
          </h2>
          <ul className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
            {zeroStockProducts.map((p) => (
              <StockItem key={p.id} product={p} quantityClassName="text-red-400 font-semibold" />
            ))}
          </ul>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl border border-yellow-700/40 bg-yellow-900/10 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-400">
            <AlertTriangle size={16} />
            Estoque baixo (menos de {LOW_STOCK_THRESHOLD} unidades)
          </h2>
          <ul className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockProducts.map((p) => (
              <StockItem key={p.id} product={p} quantityClassName="text-yellow-400" />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
