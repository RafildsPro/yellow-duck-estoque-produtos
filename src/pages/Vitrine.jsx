import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search, Send, TriangleAlert } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { supabase } from '../lib/supabase'
import { formatBRL } from '../lib/format'
import { normalize } from '../lib/normalize'

const VITRINE_URL = 'https://yellow-vitrine.vercel.app'

const STATUS_OPTIONS = [
  { value: 'hidden', label: 'Oculto' },
  { value: 'visible', label: 'Visível' },
  { value: 'presale', label: 'Pré-venda' },
]

const STATUS_STYLE = {
  hidden: 'text-gray-400',
  visible: 'text-green-400',
  presale: 'text-gold-500',
}

const KIND_LABEL = {
  novo: { text: 'Novo', className: 'bg-green-500/15 text-green-400' },
  atualizado: { text: 'Atualizado', className: 'bg-blue-500/15 text-blue-300' },
  saiu: { text: 'Sai da Vitrine', className: 'bg-red-500/15 text-red-400' },
  ignorado: { text: 'Ignorado', className: 'bg-gray-500/20 text-gray-400' },
}

const selectClass =
  'rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gold-500'

async function callPublish(dryRun) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const response = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ dryRun }),
  })
  return response
    .json()
    .catch(() => ({ ok: false, error: `Resposta inesperada do servidor (${response.status}).` }))
}

function TokenSteps() {
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-300">
      <li>
        No GitHub: Settings → Developer settings → Fine-grained tokens → criar um token só para o
        repositório <code>yellow-vitrine</code>, com permissão <b>Contents: Read and write</b>.
      </li>
      <li>
        No Vercel (projeto do estoque): Settings → Environment Variables → criar{' '}
        <code>VITRINE_GITHUB_TOKEN</code> com esse token e fazer um novo deploy.
      </li>
    </ol>
  )
}

function Chip({ label, value }) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 px-4 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-gray-100">{value}</div>
    </div>
  )
}

export default function Vitrine() {
  const { products, loading, error, setStoreStatus } = useProducts()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [published, setPublished] = useState(null)
  const [failure, setFailure] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    fetch('/api/publish')
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [])

  // Sem a coluna no banco o campo nem vem nos produtos.
  const missingColumn = products.length > 0 && !('store_status' in products[0])
  const statusOf = (p) => p.store_status || 'hidden'

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [products]
  )

  const counts = useMemo(() => {
    const result = { hidden: 0, visible: 0, presale: 0 }
    for (const p of products) result[p.store_status || 'hidden']++
    return result
  }, [products])

  const filtered = useMemo(
    () =>
      products
        .filter((p) => normalize(p.name).includes(normalize(search)))
        .filter((p) => (category ? p.category === category : true))
        .filter((p) => (statusFilter ? statusOf(p) === statusFilter : true))
        .filter((p) => (onlyInStock ? p.quantity > 0 : true)),
    [products, search, category, statusFilter, onlyInStock]
  )

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  function toggleOne(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAllFiltered() {
    const next = new Set(selected)
    if (allFilteredSelected) filtered.forEach((p) => next.delete(p.id))
    else filtered.forEach((p) => next.add(p.id))
    setSelected(next)
  }

  async function changeStatus(ids, status) {
    setSaveError('')
    try {
      await setStoreStatus(ids, status)
      // Mudou o que vai para a Vitrine: a prévia antiga deixa de valer.
      setPreview(null)
      setPublished(null)
      setSelected(new Set())
    } catch (err) {
      setSaveError(err.message || 'Não foi possível salvar.')
    }
  }

  async function runPublish(dryRun) {
    setBusy(true)
    setFailure(null)
    if (dryRun) setPublished(null)
    const result = await callPublish(dryRun).catch((err) => ({ ok: false, error: err.message }))
    setBusy(false)
    if (!result.ok) {
      setFailure(result)
      return
    }
    if (dryRun) setPreview(result)
    else {
      setPublished(result)
      setPreview(null)
    }
  }

  function handlePublish() {
    const { summary } = preview
    const removing = summary.saem > 0 ? `, tirando ${summary.saem} da Vitrine` : ''
    const ok = confirm(
      `Publicar na Vitrine agora?\n\n${summary.novos} novos, ${summary.atualizados} atualizados${removing}.\nEla é pública e atualiza em cerca de 1 minuto.`
    )
    if (ok) runPublish(false)
  }

  if (loading) return <p className="text-gray-400">Carregando produtos...</p>
  if (error) return <p className="text-red-400">Erro ao carregar dados: {error}</p>

  const canPublish = preview && preview.summary.arquivosAlterados > 0 && !busy

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Vitrine</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Escolha o que aparece na Vitrine. Só vai o que você marcar como Visível ou Pré-venda, e
            o custo nunca é enviado. O que está na Vitrine e não existe no estoque fica como está.
          </p>
        </div>
        <a
          href={VITRINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700"
        >
          <ExternalLink size={16} />
          Abrir a Vitrine
        </a>
      </div>

      {missingColumn && (
        <div className="flex gap-3 rounded-2xl border border-gold-600/50 bg-gold-500/10 p-4 text-sm text-gold-400">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Falta uma etapa no banco</p>
            <p className="mt-1 text-gray-300">
              Rode o arquivo <code className="text-gold-400">supabase/vitrine_status.sql</code> no SQL
              Editor do Supabase (uma vez só) e recarregue esta página. Ele cria o controle e já marca
              como Visível o que está na Vitrine hoje.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-navy-700 bg-navy-900 p-5">
        <div className="flex flex-wrap gap-3">
          <Chip label="Visíveis" value={counts.visible} />
          <Chip label="Pré-venda" value={counts.presale} />
          <Chip label="Ocultos" value={counts.hidden} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => runPublish(true)}
            disabled={busy || missingColumn}
            className="rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-navy-700 disabled:opacity-50"
          >
            {busy && !published ? 'Calculando...' : 'Ver o que vai mudar'}
          </button>
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            title={preview ? '' : 'Veja primeiro o que vai mudar'}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
          >
            <Send size={16} />
            Publicar na Vitrine
          </button>
          {preview && preview.summary.arquivosAlterados === 0 && (
            <span className="text-sm text-green-400">A Vitrine já está igual ao estoque. Nada a publicar.</span>
          )}
        </div>

        {config?.tokenConfigured && (
          <p className="text-xs text-green-400">Token do GitHub configurado. Pronto para publicar em {config.repo}.</p>
        )}
        {config && !config.tokenConfigured && (
          <div className="rounded-xl border border-gold-600/40 bg-gold-500/10 p-3 text-sm text-gold-400">
            <p>Falta o token do GitHub para publicar. Dá para ver a prévia, mas não gravar.</p>
            <TokenSteps />
          </div>
        )}

        {failure && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            <p>{failure.error}</p>
            {failure.code === 'no_token' && <TokenSteps />}
          </div>
        )}

        {published && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
            {published.committed ? (
              <>
                Publicado! A Vitrine atualiza em cerca de 1 minuto.{' '}
                <a
                  href={published.commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Ver a alteração no GitHub
                </a>
              </>
            ) : (
              'Nada a publicar: a Vitrine já estava igual ao estoque.'
            )}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Chip label="Novos" value={preview.summary.novos} />
              <Chip label="Atualizados" value={preview.summary.atualizados} />
              <Chip label="Saem da Vitrine" value={preview.summary.saem} />
              <Chip label="Só na Vitrine (não mexo)" value={preview.summary.soNaVitrine} />
            </div>

            {preview.changes.length > 0 && (
              <ul className="max-h-96 divide-y divide-navy-700 overflow-y-auto rounded-xl border border-navy-700">
                {preview.changes.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-3 px-3 py-2 text-sm">
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${KIND_LABEL[c.kind].className}`}
                    >
                      {KIND_LABEL[c.kind].text}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-gray-100">{c.nome}</div>
                      <div className="text-xs text-gray-400">{c.detalhe}</div>
                      {c.possivelDuplicata && (
                        <div className="mt-1 text-xs text-gold-400">
                          Pode ser o mesmo produto de “{c.possivelDuplicata}”, que já está na Vitrine.
                          Se for, vai ficar repetido.
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {preview.vitrineOnly.length > 0 && (
              <details className="text-sm text-gray-400">
                <summary className="cursor-pointer text-gray-300">
                  Itens que só existem na Vitrine (ficam como estão)
                </summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-5">
                  {preview.vitrineOnly.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-lg border border-navy-600 bg-navy-800 py-2 pl-9 pr-3 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="h-4 w-4 accent-gold-500"
          />
          Só com estoque
        </label>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold-600/40 bg-gold-500/10 px-4 py-3 text-sm">
          <span className="text-gray-200">
            {selected.size} {selected.size === 1 ? 'selecionado' : 'selecionados'}. Marcar como:
          </span>
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => changeStatus([...selected], o.value)}
              disabled={missingColumn}
              className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 font-semibold text-gray-100 hover:bg-navy-700 disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-200">
            Limpar seleção
          </button>
        </div>
      )}

      {saveError && <p className="text-sm text-red-400">{saveError}</p>}

      <div className="overflow-x-auto rounded-2xl border border-navy-700">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy-900 text-gray-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  title="Selecionar todos os que estão na lista"
                  className="h-4 w-4 accent-gold-500"
                />
              </th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Qtd.</th>
              <th className="px-4 py-3">Venda</th>
              <th className="px-4 py-3">Na Vitrine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {filtered.map((p) => (
              <tr key={p.id} className="bg-navy-900/40 hover:bg-navy-800">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="h-4 w-4 accent-gold-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-navy-700" />
                    )}
                    <span className="text-gray-100">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">{p.category}</td>
                <td
                  className={`px-4 py-3 ${p.quantity === 0 ? 'font-semibold text-red-400' : 'text-gray-300'}`}
                >
                  {p.quantity}
                </td>
                <td className="px-4 py-3 text-gray-300">{formatBRL(p.sale_price)}</td>
                <td className="px-4 py-3">
                  <select
                    value={statusOf(p)}
                    onChange={(e) => changeStatus([p.id], e.target.value)}
                    disabled={missingColumn}
                    className={`${selectClass} ${STATUS_STYLE[statusOf(p)]} disabled:opacity-50`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
