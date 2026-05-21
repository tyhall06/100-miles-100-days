// Tiny CSV generator + downloader. No deps.
function escapeCell(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function toCSV(rows, headers) {
  const headerLine = headers.map(escapeCell).join(',')
  const body = rows.map((r) => headers.map((h) => escapeCell(r[h])).join(',')).join('\n')
  return headerLine + '\n' + body
}

export function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
