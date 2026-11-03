import { useEffect, useState } from 'react'
import Modal from './Modal'
import ProductPicker from './ProductPicker'
import { formatBRL } from '../lib/format'
import {
  CHANNELS,
  SALE_KINDS,
  amountAfterDiscount,
  commissionAmount,
  moneyToInput,
  parseMoney,
  suggestedAmount,
  todayISO,
} from '../lib/sales'

const inputClass =
  'w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500'
const labelClass = 'mb-1 block text-sm font-semibold text-gray-300'

function Optional() {
  return <span className="font-normal text-gray-500"> (opcional)</span>
}

export default function RegisterSaleModal({ products, accounts = [], initialKind = 'product', onClose, onSubmit }) {
  const [kind, setKind] = useState(initialKind)
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [gross, setGross] = useState('')
  const [grossTouched, setGrossTouched] = useState(false)
  const [discount, setDiscount] = useState('')
  const [paid, setPaid] = useState('') // carta avulsa: quanto você pagou na carta (opcional)
  const [channel, setChannel] = useState('WhatsApp')
  const [account, setAccount] = useState('')
  const [soldAt, setSoldAt] = useState(() => todayISO())
  const [description, setDescription] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [pct, setPct] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Produto: o "quanto recebeu" sugere preço cadastrado × quantidade, até a pessoa digitar outro valor.
  useEffect(() => {
    if (kind !== 'product' || grossTouched) return
    const qty = Number(quantity)
    setGross(product && qty > 0 ? moneyToInput(suggestedAmount(product, qty)) : '')
  }, [kind, product, quantity, grossTouched])

  // Comissão: valor da venda × porcentagem, também editável.
  useEffect(() => {
    if (kind !== 'commission' || grossTouched) return
    const base = parseMoney(baseAmount)
    const rate = parseMoney(pct)
    setGross(base > 0 && rate > 0 ? moneyToInput(commissionAmount(base, rate)) : '')
  }, [kind, baseAmount, pct, grossTouched])

  function changeKind(next) {
    setKind(next)
    setGross('')
    setGrossTouched(false)
    setError('')
  }

  const qty = Math.floor(Number(quantity))
  const grossNum = parseMoney(gross)
  const discountNum = discount.trim() === '' ? 0 : parseMoney(discount)
  const allowsDiscount = kind !== 'commission'
  const grossOk = Number.isFinite(grossNum) && grossNum > 0
  const discountOk = Number.isFinite(discountNum) && discountNum >= 0
  const net = allowsDiscount && discountOk ? amountAfterDiscount(grossNum, discountNum) : grossNum
  const paidNum = paid.trim() === '' ? 0 : parseMoney(paid)
  const paidOk = Number.isFinite(paidNum) && paidNum >= 0
  const cost =
    kind === 'product' && product
      ? Number(product.cost_price) * (qty > 0 ? qty : 0)
      : kind === 'service' && paidOk
        ? paidNum
        : 0
  const profit = net - cost

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (kind === 'product') {
      if (!product) return setError('Escolha o produto vendido.')
      if (!(qty >= 1)) return setError('A quantidade precisa ser de pelo menos 1.')
      if (qty > product.quantity) return setError(`Só há ${product.quantity} unidade(s) em estoque.`)
    } else if (!description.trim()) {
      return setError(kind === 'service' ? 'Informe o nome da carta.' : 'Descreva a venda.')
    }
    if (kind === 'service' && !paidOk) return setError('O valor pago na carta não é válido.')
    if (!grossOk) return setError('Informe quanto você recebeu.')
    if (!discountOk) return setError('O desconto não é um valor válido.')
    if (allowsDiscount && discountNum > grossNum) return setError('O desconto não pode ser maior que o valor.')
    if (!soldAt) return setError('Informe quando foi a venda.')

    const baseNum = parseMoney(baseAmount)
    const rateNum = parseMoney(pct)

    setSaving(true)
    try {
      await onSubmit({
        kind,
        productId: kind === 'product' ? product.id : null,
        quantity: kind === 'product' ? qty : 1,
        description: kind === 'product' ? null : description.trim(),
        amount: net,
        unitCost: kind === 'service' ? paidNum : null,
        discount: allowsDiscount ? discountNum : 0,
        channel,
        account: account.trim() || null,
        soldAt,
        baseAmount: kind === 'commission' && baseNum > 0 ? baseNum : null,
        commissionPct: kind === 'commission' && rateNum > 0 ? rateNum : null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Registrar venda" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-navy-800 p-1">
          {Object.entries(SALE_KINDS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeKind(key)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm ${
                kind === key ? 'bg-gold-500 text-navy-950' : 'text-gray-300 hover:bg-navy-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          {kind === 'product'
            ? 'Produto do estoque: ao registrar, ele dá baixa no estoque e entra no faturamento.'
            : kind === 'service'
              ? 'Carta fora do estoque: não dá baixa em nenhum produto, mas entra no faturamento.'
              : 'Comissão de uma venda feita para outra pessoa: entra no faturamento só o que você recebeu.'}
        </p>

        {kind === 'product' ? (
          <div>
            <label className={labelClass}>O que você vendeu?</label>
            <ProductPicker products={products} value={product} onChange={setProduct} autoFocus />
            {product && (
              <p className="mt-1 text-xs text-gray-500">
                {Number(product.cost_price) > 0 ? (
                  <>
                    você paga <b className="text-gray-300">{formatBRL(product.cost_price)}</b> por unidade
                  </>
                ) : (
                  <span className="text-gold-500">este produto está sem custo cadastrado</span>
                )}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              {kind === 'service' ? 'Qual carta você vendeu?' : 'Qual venda gerou a comissão?'}
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={kind === 'service' ? 'Ex: Charizard ex 125/094 · NM' : 'Ex: consultoria do cliente João'}
              className={inputClass}
              autoFocus
            />
          </div>
        )}

        {kind === 'commission' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Valor da venda
                <Optional />
              </label>
              <input
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Comissão (%)
                <Optional />
              </label>
              <input
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                inputMode="decimal"
                placeholder="10"
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {kind === 'product' && (
            <div>
              <label className={labelClass}>Quantas unidades?</label>
              <input
                type="number"
                min="1"
                max={product?.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div className={kind === 'commission' ? 'col-span-2' : ''}>
            <label className={labelClass}>
              {kind === 'commission' ? 'Quanto você recebeu de comissão?' : 'Quanto você recebeu?'}
            </label>
            <input
              value={gross}
              onChange={(e) => {
                setGross(e.target.value)
                setGrossTouched(true)
              }}
              inputMode="decimal"
              placeholder="0,00"
              className={inputClass}
            />
            {kind === 'product' && product && !grossTouched && (
              <p className="mt-1 text-xs text-gray-500">sugestão pelo preço cadastrado</p>
            )}
            {kind === 'commission' && !grossTouched && gross && (
              <p className="mt-1 text-xs text-gray-500">calculado pela porcentagem</p>
            )}
          </div>
          {kind === 'service' && (
            <div>
              <label className={labelClass}>
                Quanto você pagou?
                <Optional />
              </label>
              <input
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">o que a carta custou para você</p>
            </div>
          )}
        </div>

        {allowsDiscount && (
          <div className="grid grid-cols-2 items-center gap-3">
            <div>
              <label className={labelClass}>
                Desconto
                <Optional />
              </label>
              <input
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
            </div>
            {discountOk && discountNum > 0 && grossOk && (
              <div className="text-sm text-gray-400">
                <p>
                  entra na conta{' '}
                  <b className="text-green-400">{formatBRL(amountAfterDiscount(grossNum, discountNum))}</b>
                </p>
                <p className="text-xs">
                  {formatBRL(grossNum)} − {formatBRL(discountNum)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Por onde vendeu?</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Caiu em qual conta?
              <Optional />
            </label>
            <input
              list="sale-accounts"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Ex: Banco · pessoal"
              autoComplete="off"
              className={inputClass}
            />
            <datalist id="sale-accounts">
              {accounts.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className={labelClass}>Quando foi?</label>
          <input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} className={inputClass} />
        </div>

        {kind === 'product' && product && qty >= 1 && (
          <p className="text-xs text-gray-500">
            Ao registrar, {qty} un {qty === 1 ? 'sai' : 'saem'} do estoque e o valor entra no faturamento, tudo junto.
          </p>
        )}

        {grossOk && Number.isFinite(profit) && (
          <p className="text-sm text-gray-400">
            desta venda sobra{' '}
            <b className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>{formatBRL(profit)}</b>{' '}
            <span className="text-gray-500">
              ({kind === 'product' ? 'recebido − custo' : kind === 'service' && cost > 0 ? 'recebido − o que você pagou' : 'valor recebido'})
            </span>
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gold-500 py-3 font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-60"
        >
          {saving ? 'Registrando...' : 'Registrar venda'}
        </button>
      </form>
    </Modal>
  )
}
