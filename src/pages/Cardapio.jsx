import { useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { groupBySection } from '../lib/catalog'
import { loadImageAsJpegDataUrl } from '../lib/image'
import { buildMenuPdf } from '../lib/menuPdf'

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
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState('')
  const [failure, setFailure] = useState('')

  // Só entra o que tem estoque. O PDF é público: só nome, categoria, preço de venda e foto
  // saem daqui, o custo fica de fora.
  const menuProducts = useMemo(
    () =>
      products
        .filter((p) => p.quantity > 0)
        .map((p) => ({
          name: p.name,
          category: p.category,
          sale_price: p.sale_price,
          photo_url: p.photo_url,
        })),
    [products]
  )

  const sections = useMemo(() => groupBySection(menuProducts), [menuProducts])

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
