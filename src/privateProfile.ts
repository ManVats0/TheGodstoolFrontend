// Builds a structure-only description of a table for the AI: column names,
// types, and the shape of values ("999-AAA"), never the values themselves.
// The server only accepts AI previews that start with "PROFILE:".

export function valueShape(v: unknown): string {
  return String(v ?? '').trim().slice(0, 40)
    .replace(/[A-Z]/g, 'A').replace(/[a-z]/g, 'a').replace(/\d/g, '9')
    .replace(/(.)\1{4,}/g, (_m, c) => c.repeat(4) + '+')
}

function kindOf(vals: unknown[]): string {
  const v = vals.filter(x => x !== null && x !== undefined && String(x).trim() !== '')
  if (!v.length) return 'empty'
  const s = v.map(x => String(x).trim())
  const share = (re: RegExp) => s.filter(x => re.test(x)).length / s.length
  if (v.every(x => typeof x === 'number' || /^-?\d+(\.\d+)?$/.test(String(x)))) return s.every(x => /^-?\d+$/.test(x)) ? 'integer' : 'decimal'
  if (share(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) > 0.8) return 'email'
  if (share(/^(https?:\/\/|www\.)\S+$/i) > 0.8) return 'url'
  if (share(/^\+?[\d\s().-]{7,20}$/) > 0.8 && s.every(x => (x.match(/\d/g) || []).length >= 7)) return 'phone number'
  if (s.every(x => /\d/.test(x) && !Number.isNaN(Date.parse(x)))) return 'date or time'
  return 'text'
}

export function profileFromRows(rows: Record<string, unknown>[], colInfo: { column: string; dtype?: string; null?: number }[] = []): string {
  const cols = colInfo.length ? colInfo.map(c => c.column) : Object.keys(rows[0] || {})
  const lines = [`PROFILE:`, `Table preview: ${rows.length} sample rows (values are hidden), ${cols.length} columns.`]
  for (const col of cols.slice(0, 60)) {
    const info = colInfo.find(c => c.column === col)
    const vals = rows.map(r => r[col])
    const shapes = new Map<string, number>()
    vals.filter(x => x !== null && x !== undefined && String(x).trim() !== '').forEach(x => shapes.set(valueShape(x), (shapes.get(valueShape(x)) || 0) + 1))
    const top = [...shapes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => `'${k}'`).join(', ')
    const parts = [info?.dtype ? `type ${info.dtype}` : '', `kind ${kindOf(vals)}`, info?.null != null ? `${info.null} blanks in the full table` : '', top ? `value shapes ${top}` : '']
    lines.push(`- ${JSON.stringify(col)}: ${parts.filter(Boolean).join('; ')}`)
  }
  return lines.join('\n')
}
