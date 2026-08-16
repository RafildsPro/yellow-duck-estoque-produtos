const BOM = '﻿'

function escapeCell(value) {
  const str = String(value ?? '')
  if (/[",;\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function downloadCSV(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'))
  const csv = BOM + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
