import { useMemo, useState } from 'react'
import { FileDown, MessageCircle } from 'lucide-react'
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

function downloadFile(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function pagesText(pages) {
  return `${pages} ${pages === 1 ? 'página' : 'páginas'}`
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
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [message, setMessage] = useState(null)
  // PDF já montado com as opções atuais. O envio precisa sair logo após o toque do usuário,
  // então depois de montado, baixar ou enviar de novo é instantâneo.
  const [ready, setReady] = useState(null)

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
  const optionsKey = JSON.stringify([includePhotos, [...excluded].sort(), menuProducts.length])

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

  async function generate() {
    if (ready?.key === optionsKey) return ready
    const { doc, pages, count } = await buildMenuPdf({
      products: menuProducts,
      includePhotos,
      loadImage: loadImageAsJpegDataUrl,
      onProgress: (done, total) => setProgress({ done, total }),
    })
    const file = new File(
      [doc.output('blob')],
      `cardapio-yellow-duck-${new Date().toISOString().slice(0, 10)}.pdf`,
      { type: 'application/pdf' }
    )
    const next = { file, pages, count, key: optionsKey }
    setReady(next)
    return next
  }

  async function run(action) {
    setBusy(true)
    setProgress(null)
    setMessage(null)
    try {
      await action()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Não foi possível gerar o PDF.' })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const handleDownload = () =>
    run(async () => {
      const pdf = await generate()
      downloadFile(pdf.file)
      setMessage({ kind: 'ok', text: `PDF gerado: ${pdf.count} produtos em ${pagesText(pdf.pages)}.` })
    })

  const handleWhatsApp = () =>
    run(async () => {
      const pdf = await generate()
      const text = `Olá! Segue o cardápio de produtos da Yellow Duck TCG (atualizado em ${new Date().toLocaleDateString('pt-BR')}).`
      const shareData = { files: [pdf.file], title: 'Cardápio Yellow Duck TCG', text }

      if (navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData)
          setMessage({ kind: 'ok', text: 'Cardápio enviado para o compartilhamento.' })
          return
        } catch (err) {
          if (err.name === 'AbortError') return
          if (err.name === 'NotAllowedError') {
            // Montar o PDF demorou e o navegador já não considera o toque recente.
            setMessage({
              kind: 'ok',
              text: 'PDF pronto. Toque em "Enviar pelo WhatsApp" de novo para escolher a conversa.',
            })
            return
          }
          // Qualquer outro erro do compartilhamento cai no plano B abaixo.
        }
      }

      downloadFile(pdf.file)
      setMessage({
        kind: 'ok',
        text: 'Este aparelho não envia o PDF direto, então ele foi baixado. Abra o WhatsApp e anexe o arquivo na conversa.',
        whatsappText: text,
      })
    })

  if (loading) return <p className="text-gray-400">Carregando produtos...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  const disabled = busy || menuProducts.length === 0

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
            Categorias{' '}
            <span className="font-normal text-gray-400">
              ({selectedCount} de {categories.length} marcadas)
            </span>
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
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
        >
          <FileDown size={16} />
          {busy ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700 disabled:opacity-50"
        >
          <MessageCircle size={16} />
          Enviar pelo WhatsApp
        </button>
        {busy && includePhotos && progress && (
          <span className="text-sm text-gray-400">
            Carregando fotos {progress.done}/{progress.total}
          </span>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
          {message.whatsappText && (
            <>
              {' '}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message.whatsappText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gold-500 underline hover:text-gold-400"
              >
                Abrir o WhatsApp
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )
}
