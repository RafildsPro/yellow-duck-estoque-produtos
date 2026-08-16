import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useStockMovements } from '../hooks/useStockMovements'
import { formatBRL } from '../lib/format'
import { downloadCSV } from '../lib/csv'

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  return d
}

export default function Vendas() {
  const { movements, loading, error } = useStockMovements()
  const [from, setFrom] = useState(toDateInput(startOfMonth()))
  const [to, setTo] = useState('')

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const day = m.created_at.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      return true
    })
  }, [movements, from, to])

  const totalQuantity = filtered.reduce((sum, m) => sum + Math.abs(m.quantity_change), 0)
  const totalRevenue = filtered.reduce(
    (sum, m) => sum + Math.abs(m.quantity_change) * (m.products?.sale_price || 0),
    0
  )

  function handleExportCSV() {
    const headers = ['Data', 'Produto', 'Quantidade', 'Motivo']
    const rows = filtered.map((m) => [
      new Date(m.created_at).toLocaleString('pt-BR'),
      m.products?.name ?? '-',
      m.quantity_change,
      m.reason || '',
    ])
    downloadCSV(`vendas-${from || 'inicio'}_a_${to || 'hoje'}.csv`, headers, rows)
  }

  if (loading) return <p className="text-gray-400">Carregando vendas...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-100">Vendas</h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-300">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>
        <button
          onClick={() => {
            setFrom('')
            setTo('')
          }}
          className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-navy-700 hover:text-gray-200"
        >
          Limpar filtro
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
          <span className="text-sm text-gray-400">Itens vendidos no período</span>
          <p className="mt-2 text-2xl font-bold text-gray-100">{totalQuantity}</p>
        </div>
        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
          <span className="text-sm text-gray-400">Valor vendido no período (estimado)</span>
          <p className="mt-2 text-2xl font-bold text-gold-500">{formatBRL(totalRevenue)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy-700">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-navy-900 text-gray-400">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Quantidade</th>
              <th className="px-4 py-3">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {filtered.map((m) => (
              <tr key={m.id} className="bg-navy-900/40 hover:bg-navy-800">
                <td className="px-4 py-3 text-gray-300">
                  {new Date(m.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-gray-100">{m.products?.name ?? '-'}</td>
                <td className="px-4 py-3 font-semibold text-red-400">{m.quantity_change}</td>
                <td className="px-4 py-3 text-gray-300">{m.reason || '-'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma saída registrada nesse período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
