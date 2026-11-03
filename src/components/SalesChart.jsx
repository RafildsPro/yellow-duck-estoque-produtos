import { useMemo, useState } from 'react'
import { formatBRL } from '../lib/format'
import { shortDate } from '../lib/sales'

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 12, bottom: 28, left: 12 }

// Gráfico de linha do faturamento por dia. `data`: [{ date, amount, count }].
export default function SalesChart({ data }) {
  const [active, setActive] = useState(null)

  const { points, max, path, area } = useMemo(() => {
    const innerWidth = WIDTH - PAD.left - PAD.right
    const innerHeight = HEIGHT - PAD.top - PAD.bottom
    const peak = Math.max(...data.map((d) => d.amount), 0)
    const top = peak > 0 ? peak : 1
    const step = data.length > 1 ? innerWidth / (data.length - 1) : 0
    const pts = data.map((d, i) => ({
      ...d,
      x: data.length > 1 ? PAD.left + i * step : PAD.left + innerWidth / 2,
      y: PAD.top + innerHeight - (d.amount / top) * innerHeight,
    }))
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const baseline = PAD.top + innerHeight
    const fill = pts.length
      ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${baseline} L${pts[0].x.toFixed(1)},${baseline} Z`
      : ''
    return { points: pts, max: peak, path: line, area: fill }
  }, [data])

  function handlePointer(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH
    let nearest = 0
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[nearest].x - x)) nearest = i
    })
    setActive(nearest)
  }

  const current = active !== null ? points[active] : null
  const gridY = [0, 0.5, 1].map((fraction) => PAD.top + (HEIGHT - PAD.top - PAD.bottom) * fraction)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label="Faturamento por dia"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridY.map((y, i) => (
          <line key={i} x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#1f2740" strokeDasharray="4 6" />
        ))}

        <path d={area} fill="url(#sales-area)" />
        <path d={path} fill="none" stroke="#f5c518" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map(
          (p) =>
            p.count > 0 && <circle key={p.date} cx={p.x} cy={p.y} r="3.5" fill="#f5c518" stroke="#0a0e1a" strokeWidth="1.5" />
        )}

        {current && (
          <>
            <line x1={current.x} x2={current.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#2b3552" />
            <circle cx={current.x} cy={current.y} r="5" fill="#ffe066" stroke="#0a0e1a" strokeWidth="2" />
          </>
        )}

        <text x={PAD.left} y={HEIGHT - 8} fontSize="12" fill="#6b7280">
          {points.length ? shortDate(points[0].date) : ''}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize="12" fill="#6b7280" textAnchor="end">
          {points.length > 1 ? 'hoje' : ''}
        </text>
      </svg>

      {max === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-gray-500">
          Sem vendas neste período
        </p>
      )}

      {current && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-navy-600 bg-navy-950 px-3 py-1.5 text-center text-xs shadow-lg"
          style={{ left: `${Math.min(Math.max((current.x / WIDTH) * 100, 12), 88)}%` }}
        >
          <p className="text-gray-400">
            {shortDate(current.date)} · {current.count} {current.count === 1 ? 'venda' : 'vendas'}
          </p>
          <p className="font-semibold text-gold-500">{formatBRL(current.amount)}</p>
        </div>
      )}
    </div>
  )
}
