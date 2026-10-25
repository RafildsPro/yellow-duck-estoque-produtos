import { useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { groupBySection } from '../lib/catalog'
import { loadImageAsJpegDataUrl } from '../lib/image'
import { buildMenuPdf } from '../lib/menuPdf'

const STORAGE_KEY = 'cardapio-categorias-desmarcadas'

// Lembra as categorias desmarcadas entre uma visita e outra; se o navegador bloquear, segue sem lembrar.
function loadExcluded() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [])
  } catch {
    return new Set()
  }
}

function saveExcluded(excluded) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...excluded]))
  } catch {
    // sem armazenamento local, a escolha vale só para esta visita
  }
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-gold-500"
      />
      <span>
        <span className="block text-sm font-medium text-gray-100">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  )
}

export default function Cardapio() {
  const { products, loading, error } = useProducts()
  const [includePhotos, setIncludePhotos] = useState(true)
  // Guarda as desmarcadas (não as marcadas) para que categorias novas já entrem no cardápio.
  const [excluded, setExcluded] = useState(loadExcluded)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState('')
  const [failure, setFailure] = useState('')

  const inStock = useMemo(() => products.filter((p) => p.quantity > 0), [products])

  const categories = useMemo(() => {
    const counts = new Map()
    for (const p of inStock) counts.set(p.category || '', (counts.get(p.category || '') || 0) + 1)
    return [...counts]
      .map(([key, count]) => ({ key, label: key || 'Sem categoria', count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [inStock])

  // Só entra o que tem estoque e está numa categoria marcada. O PDF é público: só nome,
  // categoria, preço de venda e foto saem daqui, o custo e a quantidade ficam de fora.
  const menuProducts = useMemo(
    () =>
      inStock
        .filter((p) => !excluded.has(p.category || ''))
        .map((p) => ({
          name: p.name,
          category: p.category,
          sale_price: p.sale_price,
          photo_url: p.photo_url,
        })),
    [inStock, excluded]
  )

  const sections = useMemo(() => groupBySection(menuProducts), [menuProducts])
  const selectedCount = categories.filter((c) => !excluded.has(c.key)).length

  function updateExcluded(next) {
    setExcluded(next)
    saveExcluded(next)
  }

  function toggleCategory(key) {
    const next = new Set(excluded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    updateExcluded(next)
  }

  async function handleDownload() {
    setGenerating(true)
    setProgress(null)
    setResult('')
    setFailure('')
    try {
      const { doc, pages, count } = await buildMenuPdf({
        products: menuProducts,
        includePhotos,
        loadImage: loadImageAsJpegDataUrl,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      doc.save(`cardapio-yellow-duck-${new Date().toISOString().slice(0, 10)}.pdf`)
      setResult(`PDF gerado: ${count} produtos em ${pages} ${pages === 1 ? 'página' : 'páginas'}.`)
    } catch (err) {
      setFailure(err.message || 'Não foi possível gerar o PDF.')
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  if (loading) return <p className="text-gray-400">Carregando produtos...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Cardápio em PDF</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monta o cardápio dos produtos que têm estoque, com foto e preço de venda, para enviar aos
          clientes. O custo nunca aparece.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-navy-700 bg-navy-900 p-5">
        <Toggle
          checked={includePhotos}
          onChange={setIncludePhotos}
          label="Incluir fotos"
          hint="Com fotos fica mais bonito. Sem fotos vira uma lista compacta, bem mais curta."
        />
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-200">
            Categorias <span className="font-normal text-gray-400">({selectedCount} de {categories.length} marcadas)</span>
          </h2>
          <div className="flex gap-3 text-sm">
            <button
              onClick={() => updateExcluded(new Set())}
              className="text-gold-500 hover:text-gold-400"
            >
              Marcar todas
            </button>
            <button
              onClick={() => updateExcluded(new Set(categories.map((c) => c.key)))}
              className="text-gray-400 hover:text-gray-200"
            >
              Desmarcar todas
            </button>
          </div>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-navy-800">
                <input
                  type="checkbox"
                  checked={!excluded.has(c.key)}
                  onChange={() => toggleCategory(c.key)}
                  className="h-4 w-4 accent-gold-500"
                />
                <span className="flex-1 truncate text-gray-200">{c.label}</span>
                <span className="text-xs text-gray-500">{c.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-200">O que vai no cardápio</h2>
          <span className="text-sm text-gray-400">
            {menuProducts.length} {menuProducts.length === 1 ? 'produto' : 'produtos'}
          </span>
        </div>
        {sections.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nenhum produto para incluir.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.key} className="flex justify-between border-b border-navy-700 py-1.5">
                <span className="text-gray-300">{s.title}</span>
                <span className="text-gray-100">{s.items.length}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownload}
          disabled={generating || menuProducts.length === 0}
          className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
        >
          <FileDown size={16} />
          {generating ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
        {generating && includePhotos && progress && (
          <span className="text-sm text-gray-400">
            Carregando fotos {progress.done}/{progress.total}
          </span>
        )}
        {result && <span className="text-sm text-green-400">{result}</span>}
        {failure && <span className="text-sm text-red-400">{failure}</span>}
      </div>
    </div>
  )
}
