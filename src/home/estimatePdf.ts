import { estimate, fmt, type Inputs } from './estimate'

export interface Who { name: string; email: string; company: string }

async function logoDataUrl(src: string): Promise<string | null> {
  try {
    const blob = await (await fetch(src)).blob()
    return await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(null); r.readAsDataURL(blob) })
  } catch { return null }
}

export async function makeEstimatePdf(inputs: Inputs, who: Who, logoSrc: string): Promise<{ file: string; save: () => void }> {
  const { jsPDF } = await import('jspdf') // loaded only when someone downloads
  const e = estimate(inputs)
  const cur = inputs.cur
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 16
  const today = new Date()
  const until = new Date(today.getTime() + 14 * 86400000)
  const d = (x: Date) => x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const no = `EST-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
  const purple: [number, number, number] = [91, 33, 182]

  // letterhead
  doc.setFillColor(...purple); doc.rect(0, 0, W, 34, 'F')
  const logo = await logoDataUrl(logoSrc)
  if (logo) { try { doc.addImage(logo, 'PNG', M, 7, 20, 20) } catch { /* skip logo */ } }
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text("The God's Tool", M + (logo ? 25 : 0), 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text('Data cleaning for CSV, Google Sheets and databases', M + (logo ? 25 : 0), 24)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('PRICE ESTIMATE', W - M, 16, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(`No. ${no}`, W - M, 22, { align: 'right' })
  doc.text(`Date ${d(today)}   |   Valid until ${d(until)}`, W - M, 27, { align: 'right' })

  let y = 46
  doc.setTextColor(30, 30, 40)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PREPARED FOR', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  const who1 = [who.name, who.company, who.email].filter(Boolean)
  ;(who1.length ? who1 : ['(not provided)']).forEach((t, k) => doc.text(t, M, y + 6 + k * 5.5))
  y += 8 + Math.max(1, who1.length) * 5.5 + 6

  const heading = (t: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...purple); doc.text(t, M, y)
    doc.setDrawColor(...purple); doc.line(M, y + 1.5, W - M, y + 1.5); y += 8; doc.setTextColor(30, 30, 40)
  }
  const row = (a: string, b: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10)
    doc.text(a, M, y); doc.text(b, W - M, y, { align: 'right' }); y += 6
  }

  heading('WHAT YOU TOLD US')
  row('Files cleaned per month', inputs.files.toLocaleString('en-US'))
  row('Typical rows per file', inputs.rows.toLocaleString('en-US'))
  row('AI actions per file', String(inputs.aiPerFile))
  row('Data sources connected', String(inputs.sources))
  row('People logging in', String(inputs.seats))
  y += 4

  if (e.custom || !e.best) {
    heading('YOUR ESTIMATE')
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text('Your setup needs a custom plan. Reply to the team at contact@thegodstool.com and we will send a price.', M, y, { maxWidth: W - 2 * M })
    y += 14
  } else {
    heading(`RECOMMENDED: ${e.best.name.toUpperCase()} (PER MONTH)`)
    for (const l of e.best.lines) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(l.label, M, y); doc.text(fmt(l.amount, cur, true), W - M, y, { align: 'right' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 100, 110); doc.text(l.detail, M, y + 4.5); doc.setTextColor(30, 30, 40); y += 11
    }
    doc.setFillColor(243, 238, 255); doc.rect(M, y - 4, W - 2 * M, 11, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('Estimated total per month', M + 3, y + 3); doc.text(fmt(e.best.total, cur, true), W - M - 3, y + 3, { align: 'right' })
    y += 16
    if (e.others.length) {
      heading('OTHER OPTIONS THAT FIT')
      e.others.forEach(o => row(o.name, `${fmt(o.total, cur, true)} per month`))
      y += 3
    }
  }

  heading('GOOD TO KNOW')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  const terms = [
    ...e.notes,
    'This is an estimate based on the figures you entered and our prices on the date above. It is not a tax invoice. A receipt or invoice is issued when you pay.',
    'Prices exclude taxes where they apply. Credits never expire. Paid plans have a 14-day money-back guarantee.',
    'Need a different setup, bulk credits or invoicing? Use the quote form on thegodstool.com or email contact@thegodstool.com.',
  ]
  terms.forEach(t => { const lines = doc.splitTextToSize('- ' + t, W - 2 * M) as string[]; doc.text(lines, M, y); y += lines.length * 4.4 + 1.5 })

  // footer
  doc.setDrawColor(200, 200, 210); doc.line(M, 280, W - M, 280)
  doc.setFontSize(8); doc.setTextColor(110, 110, 120)
  doc.text("The God's Tool  |  thegodstool.com  |  contact@thegodstool.com", W / 2, 285, { align: 'center' })

  return { file: `${no}.pdf`, save: () => doc.save(`${no}.pdf`) }
}
