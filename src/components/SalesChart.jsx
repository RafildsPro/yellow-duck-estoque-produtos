import { useMemo, useState } from 'react'
import { formatBRL } from '../lib/format'
import { shortDate } from '../lib/sales'

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 12, right: 8, bottom: 28, left: 8 }
const MIN_BAR = 2
const MAX_BAR_WIDTH = 34

// Gráfico de barras do faturamento por dia. `data`: [{ date, amount, count }].
// Dias depois de `todayDate` (o resto do mês) aparecem como um traço fraco, sem valor.
export default function SalesChart({ data, todayDate }) {
  const [active, setActive] = useState(null)

  const { bars, max, slot } = useMemo(() => {
    const innerWidth = WIDTH - PAD.left - PAD.right
    const innerHeight = HEIGHT - PAD.top - PAD.bottom
    const peak = Math.max(...data.map((d) => d.amount), 0)
    const top = peak > 0 ? peak : 1
    const slotWidth = data.length ? innerWidth / data.length : innerWidth
    const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(2, slotWidth * (data.length > 45 ? 0.75 : 0.62)))
    const list = data.map((d, i) => {
      const height = d.amount > 0 ? Math.max(3, (d.amount / top) * innerHeight) : MIN_BAR
      return {
        ...d,
        future: Boolean(todayDate) && d.date > todayDate,
        x: PAD.left + i * slotWidth + (slotWidth - barWidth) / 2,
        width: barWidth,
        height,
        y: PAD.top + innerHeight - height,
        center: PAD.left + i * slotWidth + slotWidth / 2,
      }
    })
    return { bars: list, max: peak, slot: slotWidth }
  }, [data, todayDate])

  function handlePointer(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH
    const index = Math.min(bars.length - 1, Math.max(0, Math.floor((x - PAD.left) / slot)))
    setActive(bars[index].future ? null : index)
  }

  const current = active !== null ? bars[active] : null
  const bestIndex = max > 0 ? bars.findIndex((b) => b.amount === max) : -1
  const lastIsFuture = bars.length > 0 && bars[bars.length - 1].future
  const todayBar = lastIsFuture ? bars.filter((b) => !b.future).pop() : null

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
        {bars.map((bar, i) => (
          <rect
            key={bar.date}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={Math.min(4, bar.width / 2)}
            fill={bar.future ? '#161d31' : bar.amount > 0 ? (i === active ? '#86efac' : '#4ade80') : '#1f2740'}
            opacity={bar.amount > 0 && i !== bestIndex && active === null ? 0.85 : 1}
          />
        ))}

        <text x={PAD.left} y={HEIGHT - 8} fontSize="12" fill="#6b7280">
          {bars.length ? shortDate(bars[0].date) : ''}
        </text>
        {lastIsFuture ? (
          <>
            {todayBar && (
              <text x={todayBar.center} y={HEIGHT - 8} fontSize="12" fill="#f5c518" textAnchor="middle">
                hoje
              </text>
            )}
            <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize="12" fill="#6b7280" textAnchor="end">
              {shortDate(bars[bars.length - 1].date)}
            </text>
          </>
        ) : (
          <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize="12" fill="#6b7280" textAnchor="end">
            {bars.length > 1 ? 'hoje' : ''}
          </text>
        )}
      </svg>

      {max === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-gray-500">
          Sem vendas neste período
        </p>
      )}

      {current && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-navy-600 bg-navy-950 px-3 py-1.5 text-center text-xs shadow-lg"
          style={{ left: `${Math.min(Math.max((current.center / WIDTH) * 100, 12), 88)}%` }}
        >
          <p className="text-gray-400">
            {shortDate(current.date)} · {current.count} {current.count === 1 ? 'venda' : 'vendas'}
          </p>
          <p className="font-semibold text-green-400">{formatBRL(current.amount)}</p>
        </div>
      )}
    </div>
  )
}
