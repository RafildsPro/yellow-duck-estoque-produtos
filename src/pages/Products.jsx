import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, PackageMinus, MinusCircle, Layers, Search, Download } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { LOW_STOCK_THRESHOLD } from '../lib/constants'
import { formatBRL } from '../lib/format'
import { normalize } from '../lib/normalize'
import { downloadCSV } from '../lib/csv'
import ProductForm from '../components/ProductForm'
import StockOutModal from '../components/StockOutModal'
import MultiSaleModal from '../components/MultiSaleModal'

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Mais recentes' },
  { value: 'sale_price-desc', label: 'Valor de venda (maior)' },
  { value: 'sale_price-asc', label: 'Valor de venda (menor)' },
  { value: 'quantity-desc', label: 'Quantidade (maior)' },
  { value: 'quantity-asc', label: 'Quantidade (menor)' },
]

export default function Products() {
  const { products, loading, error, createProduct, updateProduct, deleteProduct, registerStockOut } =
    useProducts()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('created_at-desc')
  const [editingProduct, setEditingProduct] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [stockOutProduct, setStockOutProduct] = useState(null)
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [showMultiSale, setShowMultiSale] = useState(false)

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  )

  const filtered = useMemo(() => {
    const [field, dir] = sort.split('-')
    return products
      .filter((p) => normalize(p.name).includes(normalize(search)))
      .filter((p) => (category ? p.category === category : true))
      .sort((a, b) => {
        const va = a[field]
        const vb = b[field]
        if (va < vb) return dir === 'asc' ? -1 : 1
        if (va > vb) return dir === 'asc' ? 1 : -1
        return 0
      })
  }, [products, search, category, sort])

  function openNewForm() {
    setEditingProduct(null)
    setShowForm(true)
  }

  function openEditForm(product) {
    setEditingProduct(product)
    setShowForm(true)
  }

  async function handleSave(payload) {
    if (editingProduct) await updateProduct(editingProduct.id, payload)
    else await createProduct(payload)
  }

  async function handleDelete(product) {
    if (!confirm(`Excluir "${product.name}" do estoque?`)) return
    await deleteProduct(product.id)
  }

  async function handleQuickSale(product) {
    if (product.quantity < 1) return
    await registerStockOut(product, 1, 'Venda rápida')
  }

  function handleExportCSV() {
    const headers = [
      'Nome',
      'Categoria',
      'Quantidade',
      'Custo',
      'Venda',
      'Condição',
      'Data de entrada',
      'Observações',
    ]
    const rows = filtered.map((p) => [
      p.name,
      p.category,
      p.quantity,
      p.cost_price,
      p.sale_price,
      p.condition || '',
      new Date(p.entry_date).toLocaleDateString('pt-BR'),
      p.notes || '',
    ])
    downloadCSV(`estoque-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  if (loading) return <p className="text-gray-400">Carregando produtos...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-100">Produtos</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowMultiSale(true)}
            className="flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700"
          >
            <Layers size={16} />
            Venda múltipla
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400"
          >
            <Plus size={16} />
            Novo produto
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-lg border border-navy-600 bg-navy-800 py-2 pl-9 pr-3 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy-700">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy-900 text-gray-400">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Qtd.</th>
              <th className="px-4 py-3">Custo</th>
              <th className="px-4 py-3">Venda</th>
              <th className="px-4 py-3">Condição</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {filtered.map((p) => (
              <tr key={p.id} className="bg-navy-900/40 hover:bg-navy-800">
                <td className="flex items-center gap-2 px-4 py-3">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      onClick={() => setPreviewPhoto(p.photo_url)}
                      className="h-8 w-8 cursor-zoom-in rounded object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-navy-700" />
                  )}
                  <span className="text-gray-100">{p.name}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">{p.category}</td>
                <td
                  className={`px-4 py-3 ${
                    p.quantity === 0
                      ? 'text-red-400 font-semibold'
                      : p.quantity < LOW_STOCK_THRESHOLD
                        ? 'text-yellow-400 font-semibold'
                        : 'text-gray-300'
                  }`}
                >
                  {p.quantity}
                </td>
                <td className="px-4 py-3 text-gray-300">{formatBRL(p.cost_price)}</td>
                <td className="px-4 py-3 text-gray-300">{formatBRL(p.sale_price)}</td>
                <td className="px-4 py-3 text-gray-300">{p.condition || '-'}</td>
                <td className="px-4 py-3 text-gray-300">
                  {new Date(p.entry_date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleQuickSale(p)}
                      disabled={p.quantity < 1}
                      title="Vender 1 unidade rapidamente"
                      className="rounded-lg p-2 text-gray-400 hover:bg-navy-700 hover:text-gold-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MinusCircle size={16} />
                    </button>
                    <button
                      onClick={() => setStockOutProduct(p)}
                      title="Registrar saída"
                      className="rounded-lg p-2 text-gray-400 hover:bg-navy-700 hover:text-gold-500"
                    >
                      <PackageMinus size={16} />
                    </button>
                    <button
                      onClick={() => openEditForm(p)}
                      title="Editar"
                      className="rounded-lg p-2 text-gray-400 hover:bg-navy-700 hover:text-gold-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      title="Excluir"
                      className="rounded-lg p-2 text-gray-400 hover:bg-navy-700 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductForm product={editingProduct} onClose={() => setShowForm(false)} onSave={handleSave} />
      )}

      {stockOutProduct && (
        <StockOutModal
          product={stockOutProduct}
          onClose={() => setStockOutProduct(null)}
          onConfirm={(qty, reason) => registerStockOut(stockOutProduct, qty, reason)}
        />
      )}

      {showMultiSale && (
        <MultiSaleModal
          products={products}
          onClose={() => setShowMultiSale(false)}
          onConfirm={(product, qty, reason) => registerStockOut(product, qty, reason)}
        />
      )}

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 p-4"
        >
          <img src={previewPhoto} alt="" className="max-h-[80vh] max-w-[80vw] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  )
}
