import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import ProductPicker from './ProductPicker'
import { formatBRL } from '../lib/format'
import { CHANNELS, moneyToInput, parseMoney, suggestedAmount, todayISO } from '../lib/sales'

const inputClass =
  'rounded-lg border border-navy-600 bg-navy-900 px-2 py-1 text-sm text-gray-100 outline-none focus:border-gold-500'

// Várias vendas de uma vez. Cada produto vira uma venda, com o valor sugerido pelo preço cadastrado.
// `onConfirm(lines, { channel, soldAt })`, com lines = [{ productId, quantity, amount }].
export default function MultiSaleModal({ products, onClose, onConfirm }) {
  const [items, setItems] = useState([]) // [{ product, quantity, amount, touched }]
  const [channel, setChannel] = useState('WhatsApp')
  const [soldAt, setSoldAt] = useState(() => todayISO())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const available = useMemo(
    () => products.filter((p) => !items.some((i) => i.product.id === p.id)),
    [products, items]
  )

  function addItem(product) {
    setItems((prev) => [
      ...prev,
      { product, quantity: '1', amount: moneyToInput(suggestedAmount(product, 1)), touched: false },
    ])
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i
        const qty = Number(quantity)
        const amount = !i.touched && qty > 0 ? moneyToInput(suggestedAmount(i.product, qty)) : i.amount
        return { ...i, quantity, amount }
      })
    )
  }

  function updateAmount(productId, amount) {
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, amount, touched: true } : i)))
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const total = items.reduce((sum, i) => {
    const value = parseMoney(i.amount)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (items.length === 0) return setError('Adicione pelo menos um produto.')
    const lines = []
    for (const i of items) {
      const qty = Math.floor(Number(i.quantity))
      const amount = parseMoney(i.amount)
      if (!(qty >= 1) || qty > i.product.quantity) {
        return setError(`Quantidade inválida para "${i.product.name}" (estoque: ${i.product.quantity}).`)
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return setError(`Informe o valor recebido de "${i.product.name}".`)
      }
      lines.push({ productId: i.product.id, quantity: qty, amount })
    }
    if (!soldAt) return setError('Informe quando foi a venda.')

    setSaving(true)
    try {
      await onConfirm(lines, { channel, soldAt })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Venda múltipla" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-300">Adicionar produto</label>
          <ProductPicker products={available} value={null} onChange={addItem} autoFocus />
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.product.id} className="rounded-lg bg-navy-800 px-3 py-2">
                <p className="truncate text-sm text-gray-100">{i.product.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Qtd.</label>
                  <input
                    type="number"
                    min="1"
                    max={i.product.quantity}
                    value={i.quantity}
                    onChange={(e) => updateQuantity(i.product.id, e.target.value)}
                    className={`w-16 ${inputClass}`}
                  />
                  <label className="ml-2 text-xs text-gray-500">Recebeu</label>
                  <input
                    value={i.amount}
                    onChange={(e) => updateAmount(i.product.id, e.target.value)}
                    inputMode="decimal"
                    className={`min-w-0 flex-1 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i.product.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-navy-700 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-300">Por onde vendeu? (vale para todos)</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  channel === c
                    ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                    : 'border-navy-600 text-gray-300 hover:bg-navy-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-300">Quando foi?</label>
          <input
            type="date"
            value={soldAt}
            onChange={(e) => setSoldAt(e.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-sm text-gray-400">
            Total <b className="text-green-400">{formatBRL(total)}</b>
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-navy-700">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-60"
            >
              {saving ? 'Registrando...' : `Confirmar venda (${items.length})`}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
