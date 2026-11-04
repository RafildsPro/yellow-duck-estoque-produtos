import { useState } from 'react'
import { Wallet, TrendingUp, PiggyBank, Boxes, AlertTriangle, Trash2 } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { formatBRL } from '../lib/format'
import { LOW_STOCK_THRESHOLD } from '../lib/constants'

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

function StockItem({ product, quantityClassName, onRemove }) {
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
      <div className="flex flex-shrink-0 items-center gap-1">
        <span className={quantityClassName}>{product.quantity} un.</span>
        {onRemove && (
          <button
            onClick={() => onRemove(product)}
            title="Não vou comprar mais: excluir do estoque"
            className="rounded-lg p-2 text-gray-500 hover:bg-navy-700 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  )
}

export default function Dashboard() {
  const { products, loading, error, deleteProduct } = useProducts()
  const [removeError, setRemoveError] = useState('')

  // Tira do estoque um produto que acabou e que não vai ser comprado de novo.
  async function handleRemove(product) {
    const onStorefront = ['visible', 'presale'].includes(product.store_status)
    const note = onStorefront
      ? '\n\nAtenção: ele está publicado na Vitrine e continua lá até você tirar pelo /admin da Vitrine.'
      : ''
    if (!confirm(`Excluir "${product.name}" do estoque?\n\nAs vendas dele que já estão registradas continuam no histórico.${note}`)) return
    setRemoveError('')
    try {
      await deleteProduct(product.id)
    } catch (err) {
      setRemoveError(err.message)
    }
  }

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
          <p className="mb-3 text-xs text-gray-500">
            Não vai comprar mais algum? Use a lixeira para tirar da lista (exclui o produto do estoque).
          </p>
          {removeError && <p className="mb-2 text-sm text-red-400">{removeError}</p>}
          <ul className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
            {zeroStockProducts.map((p) => (
              <StockItem
                key={p.id}
                product={p}
                quantityClassName="text-red-400 font-semibold"
                onRemove={handleRemove}
              />
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
