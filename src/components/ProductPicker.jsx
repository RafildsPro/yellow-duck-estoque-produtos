import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { formatBRL } from '../lib/format'
import { normalize } from '../lib/normalize'

// Escolha de produto: começa a digitar e as sugestões aparecem; ao tocar no campo, vem a lista com todos.
export default function ProductPicker({ products, value, onChange, autoFocus = false }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = useMemo(() => {
    const term = normalize(query)
    return products
      .filter((p) => !term || normalize(p.name).includes(term))
      .sort((a, b) => Number(b.quantity > 0) - Number(a.quantity > 0) || a.name.localeCompare(b.name, 'pt-BR'))
  }, [products, query])

  useEffect(() => {
    setHighlight(Math.max(0, results.findIndex((p) => p.quantity > 0)))
  }, [results])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  function choose(product) {
    if (product.quantity < 1) return
    onChange(product)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      let next = highlight
      for (let i = 0; i < results.length; i++) {
        next = (next + step + results.length) % results.length
        if (results[next].quantity > 0) break
      }
      setHighlight(next)
    } else if (e.key === 'Enter') {
      if (open && results[highlight]) {
        e.preventDefault()
        choose(results[highlight])
      }
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2">
        {value.photo_url ? (
          <img src={value.photo_url} alt="" className="h-10 w-10 flex-shrink-0 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 flex-shrink-0 rounded bg-navy-700" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-100">{value.name}</p>
          <p className="text-xs text-gray-500">
            {value.quantity} em estoque · {formatBRL(value.sale_price)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
          className="flex-shrink-0 text-sm text-gold-500 hover:text-gold-400"
        >
          Trocar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          placeholder="Digite o nome ou toque para ver todos"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          className="w-full rounded-lg border border-navy-600 bg-navy-800 py-2 pl-9 pr-3 text-gray-100 outline-none focus:border-gold-500"
        />
      </div>

      {open && (
        <div ref={listRef} className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-navy-600 bg-navy-800">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Nenhum produto encontrado.</p>
          ) : (
            results.map((p, index) => {
              const soldOut = p.quantity < 1
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={soldOut}
                  data-active={index === highlight}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                    index === highlight && !soldOut ? 'bg-navy-700' : ''
                  } ${soldOut ? 'cursor-not-allowed opacity-40' : 'hover:bg-navy-700'}`}
                >
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="h-9 w-9 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-9 w-9 flex-shrink-0 rounded bg-navy-700" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-gray-100">{p.name}</span>
                    <span className="block text-xs text-gray-500">
                      {soldOut ? 'sem estoque' : `${p.quantity} em estoque`} · {formatBRL(p.sale_price)}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
